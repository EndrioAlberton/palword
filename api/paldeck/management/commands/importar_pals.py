import json
from pathlib import Path

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from paldeck.models import Pal, Tipo


def importar_pals(baixar_imagens=True, arquivo=None, stdout=None):
    """Importa/atualiza os pals a partir do JSON do palworld-paldex-api.

    Idempotente: pode rodar de novo para atualizar dados sem perder
    `descoberto` nem os breedings cadastrados.
    Retorna (criados, atualizados, erros_imagem).
    """
    if arquivo:
        dados = json.loads(Path(arquivo).read_text(encoding='utf-8'))
    else:
        resp = requests.get(settings.PALDEX_JSON_URL, timeout=30)
        resp.raise_for_status()
        dados = resp.json()

    pasta_imagens = Path(settings.MEDIA_ROOT) / 'pals'
    pasta_imagens.mkdir(parents=True, exist_ok=True)

    criados = atualizados = erros_imagem = 0
    for item in dados:
        key = item['key']
        defaults = {
            'paldeck_id': item['id'],
            'nome': item['name'],
            'descricao': item.get('description', ''),
            'stats': item.get('stats', {}),
            'skills': item.get('skills', []),
            'suitability': item.get('suitability', []),
            'drops': item.get('drops', []),
            'breeding_rank': (item.get('breeding') or {}).get('rank'),
            'raridade': item.get('rarity'),
            'genus': item.get('genus', '') or '',
        }

        destino = pasta_imagens / f'{key}.png'
        if baixar_imagens and not destino.exists():
            try:
                img = requests.get(f'{settings.PALDEX_IMAGES_URL}/{key}.png', timeout=30)
                img.raise_for_status()
                destino.write_bytes(img.content)
            except requests.RequestException:
                erros_imagem += 1
        if destino.exists():
            defaults['imagem'] = f'pals/{key}.png'

        pal, criado = Pal.objects.update_or_create(key=key, defaults=defaults)
        tipos = [Tipo.objects.get_or_create(nome=t['name'])[0] for t in item.get('types', [])]
        pal.tipos.set(tipos)

        criados += criado
        atualizados += not criado
        if stdout:
            stdout.write(f'{"+" if criado else "~"} #{key} {pal.nome}')

    return criados, atualizados, erros_imagem


class Command(BaseCommand):
    help = 'Importa/atualiza os pals a partir do palworld-paldex-api (JSON + imagens)'

    def add_arguments(self, parser):
        parser.add_argument('--sem-imagens', action='store_true', help='Não baixa as imagens')
        parser.add_argument('--arquivo', help='Caminho de um pals.json local em vez de baixar da URL')

    def handle(self, *args, **options):
        try:
            criados, atualizados, erros_imagem = importar_pals(
                baixar_imagens=not options['sem_imagens'],
                arquivo=options.get('arquivo'),
                stdout=self.stdout,
            )
        except requests.RequestException as exc:
            raise CommandError(f'Falha ao baixar dados: {exc}')

        msg = f'{criados} pals criados, {atualizados} atualizados'
        if erros_imagem:
            msg += f', {erros_imagem} imagens falharam'
        self.stdout.write(self.style.SUCCESS(msg))
