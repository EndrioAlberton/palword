import re
from pathlib import Path
from urllib.parse import quote

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from paldeck.models import Pal, Tipo, Breeding

CARGO_API = 'https://palworld.wiki.gg/api.php'
# URL direta dos arquivos (padrão File:<Nome>_icon.png) — Special:FilePath é bloqueado pelo Cloudflare (403)
IMAGE_BASE = 'https://palworld.wiki.gg/images'

# sem User-Agent de navegador o Cloudflare da wiki.gg pode bloquear as requisições
SESSION = requests.Session()
SESSION.headers['User-Agent'] = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
)


def _cargoquery(tables, fields, where=None, limit=500):
    """Busca todas as linhas de uma tabela Cargo da wiki, paginando por offset."""
    linhas = []
    offset = 0
    while True:
        params = {
            'action': 'cargoquery',
            'format': 'json',
            'tables': tables,
            'fields': fields,
            'limit': limit,
            'offset': offset,
        }
        if where:
            params['where'] = where
        resp = SESSION.get(CARGO_API, params=params, timeout=30)
        resp.raise_for_status()
        pagina = resp.json().get('cargoquery', [])
        linhas.extend(item['title'] for item in pagina)
        if len(pagina) < limit:
            break
        offset += limit
    return linhas


def _traduzir_lote(textos, cache):
    """Traduz uma lista de textos en->pt em lote, preenchendo o cache. Falha graciosamente."""
    unicos = sorted({t for t in textos if t and t not in cache})
    if not unicos:
        return
    from deep_translator import GoogleTranslator
    TAMANHO_LOTE = 50
    for i in range(0, len(unicos), TAMANHO_LOTE):
        pedaco = unicos[i:i + TAMANHO_LOTE]
        try:
            traduzidos = GoogleTranslator(source='en', target='pt').translate_batch(pedaco)
        except Exception:
            traduzidos = pedaco  # falhou a tradução, mantém original em inglês
        for original, traduzido in zip(pedaco, traduzidos):
            cache[original] = traduzido or original


def importar_pals(baixar_imagens=True, stdout=None):
    """Importa os pals a partir das tabelas Cargo da palworld.wiki.gg.

    Substitui completamente os pals existentes (a numeração do Paldeck da wiki
    diverge da fonte antiga, então não dá pra casar por `key` com segurança).
    """
    pais = _cargoquery('Pal', 'palName,paldeckNumber,palSize,partnerSkill,palGear,hungerRate,isNocturnal,sellPrice')
    elementos = _cargoquery('PalElement', 'palName,element')
    trabalhos = _cargoquery('PalWorkSuitability', 'palName,workType,level')
    stats = _cargoquery('PalStat', 'palName,palVariant,baseHp,baseAttack,baseDefense,baseWorkSpeed,stamina,walkSpeed,runSpeed,rideSprintSpeed,captureRate', where="palVariant='Normal'")
    parceiro = _cargoquery('PalPartnerSkill', 'palName,partnerSkill,description,type')
    drops = _cargoquery('DropDefeat', 'targetName,itemName')

    por_pal = {}
    for p in pais:
        por_pal[p['palName']] = {'pal': p, 'elementos': [], 'trabalhos': [], 'drops': set()}

    for e in elementos:
        if e['palName'] in por_pal:
            por_pal[e['palName']]['elementos'].append(e['element'])

    for t in trabalhos:
        if t['palName'] in por_pal:
            por_pal[t['palName']]['trabalhos'].append({'type': t['workType'].lower(), 'level': int(t['level'] or 0)})

    stats_por_pal = {s['palName']: s for s in stats}

    parceiro_por_pal = {p['palName']: p for p in parceiro}

    for d in drops:
        if d['targetName'] in por_pal and d.get('itemName'):
            por_pal[d['targetName']]['drops'].add(d['itemName'])

    # traduz tudo em lote antes de montar os registros (evita chamada por pal)
    cache_traducao = {}
    textos_para_traduzir = []
    for nome, dados in por_pal.items():
        textos_para_traduzir.extend(dados['drops'])
        ps = parceiro_por_pal.get(nome)
        if ps:
            textos_para_traduzir.append(ps.get('partnerSkill', ''))
            textos_para_traduzir.append(ps.get('description', ''))
        gear = dados['pal'].get('palGear')
        if gear:
            textos_para_traduzir.append(gear)
    _traduzir_lote(textos_para_traduzir, cache_traducao)

    def traduzido(texto):
        return cache_traducao.get(texto, texto) if texto else texto

    pasta_imagens = Path(settings.MEDIA_ROOT) / 'pals'
    pasta_imagens.mkdir(parents=True, exist_ok=True)

    # guarda descobertas e breedings pra restaurar depois do replace (casando por nome)
    descobertos = dict(Pal.objects.filter(descoberto=True).values_list('nome', 'descoberto_em'))
    breedings_salvos = list(Breeding.objects.values_list('filho__nome', 'pai__nome', 'mae__nome'))

    Pal.objects.all().delete()
    Tipo.objects.all().delete()

    criados = erros_imagem = 0
    for nome, dados in por_pal.items():
        p = dados['pal']
        key = p['paldeckNumber']
        digitos = re.sub(r'\D', '', key)
        if not digitos:
            continue

        st = stats_por_pal.get(nome, {})
        ps = parceiro_por_pal.get(nome)

        defaults = {
            'paldeck_id': int(digitos),
            'nome': nome,
            'tamanho': p.get('palSize', ''),
            'passiva': traduzido(ps['partnerSkill']) if ps else '',
            'passiva_descricao': traduzido(ps['description']) if ps else '',
            'equipamento': traduzido(p.get('palGear', '')),
            'taxa_fome': int(p['hungerRate']) if p.get('hungerRate') else None,
            'noturno': p.get('isNocturnal') == '1',
            'preco_venda': int(p['sellPrice']) if p.get('sellPrice') else None,
            'suitability': dados['trabalhos'],
            'drops': sorted(traduzido(d) for d in dados['drops']),
            'stats': {
                'hp': float(st['baseHp']) if st.get('baseHp') else None,
                'attack': float(st['baseAttack']) if st.get('baseAttack') else None,
                'defense': float(st['baseDefense']) if st.get('baseDefense') else None,
                'work_speed': float(st['baseWorkSpeed']) if st.get('baseWorkSpeed') else None,
                'stamina': float(st['stamina']) if st.get('stamina') else None,
                'walk_speed': float(st['walkSpeed']) if st.get('walkSpeed') else None,
                'run_speed': float(st['runSpeed']) if st.get('runSpeed') else None,
                'ride_sprint_speed': float(st['rideSprintSpeed']) if st.get('rideSprintSpeed') else None,
                'capture_rate': float(st['captureRate']) if st.get('captureRate') else None,
            },
        }

        destino = pasta_imagens / f'{key}.png'
        if baixar_imagens:
            try:
                nome_arquivo = quote(nome.replace(' ', '_'))
                img = SESSION.get(f'{IMAGE_BASE}/{nome_arquivo}_icon.png', timeout=30)
                img.raise_for_status()
                destino.write_bytes(img.content)
            except requests.RequestException:
                erros_imagem += 1
        if destino.exists():
            defaults['imagem'] = f'pals/{key}.png'

        pal = Pal.objects.create(key=key, **defaults)
        tipos = [Tipo.objects.get_or_create(nome=el.lower())[0] for el in dados['elementos']]
        pal.tipos.set(tipos)

        criados += 1
        if stdout:
            stdout.write(f'+ #{key} {nome}')

    # restaura o que foi salvo antes do replace
    for nome_pal, quando in descobertos.items():
        Pal.objects.filter(nome=nome_pal).update(descoberto=True, descoberto_em=quando)
    for filho_nome, pai_nome, mae_nome in breedings_salvos:
        filho = Pal.objects.filter(nome=filho_nome).first()
        pai = Pal.objects.filter(nome=pai_nome).first()
        mae = Pal.objects.filter(nome=mae_nome).first()
        if filho and pai and mae:
            Breeding.objects.get_or_create(filho=filho, pai=pai, mae=mae)

    return criados, 0, erros_imagem


class Command(BaseCommand):
    help = 'Substitui os pals pelos dados atuais da palworld.wiki.gg (Cargo API)'

    def add_arguments(self, parser):
        parser.add_argument('--sem-imagens', action='store_true', help='Não baixa as imagens')

    def handle(self, *args, **options):
        try:
            criados, atualizados, erros_imagem = importar_pals(
                baixar_imagens=not options['sem_imagens'],
                stdout=self.stdout,
            )
        except requests.RequestException as exc:
            raise CommandError(f'Falha ao baixar dados: {exc}')

        msg = f'{criados} pals importados'
        if erros_imagem:
            msg += f', {erros_imagem} imagens falharam'
        self.stdout.write(self.style.SUCCESS(msg))
