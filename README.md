# PalDeck — Paldeck de Pals Descobertos

Documentação para desenvolver a aplicação. Mesma stack do projeto-whey: **Next.js + Django/DRF + PostgreSQL + AWS EC2**.

## O que é

Aplicação temática de **Palworld** para registrar os pals descobertos pelo jogador. Um admin marca os pals como "descobertos" pelo ID do Paldeck; o site exibe uma grade de **esferas (Pal Spheres)** com a foto de cada pal descoberto. Clicando na esfera abre a página de detalhes do pal, que mostra suas informações e **de quais combinações de breeding ele pode nascer** (cadastradas manualmente pelo admin).

## Como rodar localmente (Windows)

```powershell
# Backend (porta 8000) — usa sqlite local (MySQL só em produção via DB_ENGINE=mysql)
cd api
..\venv\Scripts\python manage.py runserver

# Frontend (porta 3000)
cd site
npm run dev
```

- Admin: http://localhost:8000/admin/ — usuário `admin`, senha `paldeck123` (troque!).
- Importar/atualizar pals: botão **↻ Importar pals (API)** no admin, ou `manage.py importar_pals`.
- Marcar descoberto: campo "ID ou key" no topo da listagem de Pals no admin (aceita `85` ou `085B`), ou a action em massa.
- Breeding: cadastrado no inline "nasce de" dentro do form de cada Pal.
- Se o pip falhar com erro 401 do CodeArtifact, use `-i https://pypi.org/simple` (o pip global da máquina aponta para o registry da Maxiquim).

## Fonte de dados — palworld-paldex-api

Repositório: https://github.com/mlg404/palworld-paldex-api

- API open source (TypeScript + ElysiaJS + Bun), **self-hosted** — não existe endpoint público garantido.
- Endpoint único `GET /` com filtros: `page`, `limit`, `name`, `types`, `key`, `term`.
- Resposta por pal:

```json
{
  "id": 85,
  "key": "085",
  "name": "Relaxaurus",
  "image": "/public/images/paldeck/085.png",
  "types": ["dragon", "water"],
  "stats": {
    "hp": 110,
    "attack": { "melee": 110, "ranged": 100 },
    "defense": 70,
    "speed": { "ride": 800, "run": 650, "walk": 60 }
  },
  "breeding": { "rank": 280, "order": 54 },
  "skills": [],
  "suitability": [],
  "drops": []
}
```

- **Imagens vêm da API** em `/public/images/paldeck/<key>.png`.

### Estratégia de importação (recomendada)

**Não** manter a API Bun rodando em produção. Em vez disso:

1. Rodar a API localmente uma vez (`bun install && bun start`, porta 3000) — ou ler direto o JSON de dados do repositório (`src/common/data/pals.json`).
2. Management command `python manage.py importar_pals` que:
   - Consome a API/JSON e faz `update_or_create` de cada `Pal` no banco (idempotente — pode rodar de novo para atualizar).
   - Baixa as imagens para `media/pals/<key>.png` (servidas pelo nginx, sem dependência externa).
3. Rodar de novo apenas quando o jogo ganhar pals novos (Paldeck cresce com updates do jogo).

Espelho do padrão do whey: equivalente ao `atualizar_precos`, mas de execução esporádica.

## Arquitetura

```
projeto-palworld/
├── api/                  # Django + DRF (porta 8000 via gunicorn)
│   ├── core/             # settings, urls raiz, wsgi
│   └── paldeck/          # app principal
│       ├── models.py     # Pal, Tipo, Breeding
│       ├── serializers.py
│       ├── views.py
│       ├── admin.py
│       └── management/commands/importar_pals.py
└── site/                 # Next.js App Router (porta 3000 via pm2)
    ├── app/
    │   ├── page.jsx          # grade de esferas — pals descobertos (SSR)
    │   ├── pal/[key]/page.jsx  # detalhe do pal (generateMetadata dinâmico)
    │   ├── layout.jsx
    │   └── globals.css
    ├── components/       # PalSphere, PalGrid, PalDetail, BreedingList, ThemeToggle
    └── lib/api.js        # fetch wrapper (API_URL env var, cache: 'no-store')
```

nginx: `/api/` e `/admin/` → Django 8000; `/media/` → arquivos estáticos de imagem; resto → Next.js 3000.

## Modelos — `paldeck/models.py`

```python
class Tipo(models.Model):
    nome = models.CharField(max_length=20, unique=True)   # fire, water, dragon...

class Pal(models.Model):
    paldeck_id = models.PositiveIntegerField(unique=True)  # id numérico (85)
    key = models.CharField(max_length=10, unique=True)     # "085", "085B" (variantes)
    nome = models.CharField(max_length=100)
    imagem = models.ImageField(upload_to="pals/")          # baixada na importação
    tipos = models.ManyToManyField(Tipo)
    stats = models.JSONField(default=dict)                 # hp, attack, defense, speed
    breeding_rank = models.PositiveIntegerField(null=True) # breeding.rank da API
    skills = models.JSONField(default=list)
    suitability = models.JSONField(default=list)           # trabalhos de base
    drops = models.JSONField(default=list)

    descoberto = models.BooleanField(default=False)        # marcado pelo admin
    descoberto_em = models.DateTimeField(null=True, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True)

class Breeding(models.Model):
    """Combinação de pais que gera um pal filho. Cadastro manual no admin."""
    filho = models.ForeignKey(Pal, on_delete=models.CASCADE, related_name="nasce_de")
    pai = models.ForeignKey(Pal, on_delete=models.CASCADE, related_name="+")
    mae = models.ForeignKey(Pal, on_delete=models.CASCADE, related_name="+")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["filho", "pai", "mae"], name="breeding_unico"),
        ]
```

Notas:
- Campos volumosos e sem necessidade de filtro relacional (stats, skills, drops) ficam em `JSONField` — evita explosão de tabelas na v1.
- `pai`/`mae` são simétricos no jogo (A+B = B+A); normalizar na gravação (ex.: sempre salvar com `pai.paldeck_id <= mae.paldeck_id`) para não duplicar combinações invertidas.
- `descoberto` fica no próprio `Pal` (não em tabela separada) — app é single-player/single-admin, como o whey.

## API DRF — `paldeck/views.py`

| Endpoint | Descrição |
|---|---|
| `GET /api/pals/` | Lista pals. `?descoberto=true` filtra os descobertos (query da home) |
| `GET /api/pals/<key>/` | Detalhe do pal, incluindo `nasce_de` (breedings) serializado nested |

Serializer do detalhe inclui as combinações com dados mínimos dos pais (key, nome, imagem) para renderizar a lista de breeding sem novas requisições.

Filtros de tipo/nome na home são **client-side** (mesmo padrão do CatalogClient do whey) — o dataset inteiro tem ~200 pals, cabe na resposta.

## Admin Django

- `/admin/` — CRUD de Pal e Breeding.
- **Marcar descoberto por ID**: campo de busca no topo da listagem de Pal (template `change_list` customizado, como o botão de preços do whey) — admin digita o `paldeck_id` ou `key`, POST em view protegida por `@staff_member_required` que seta `descoberto=True` e `descoberto_em=now()`. Alternativa mais simples para a v1: action em massa "Marcar como descoberto" na listagem.
- **Breeding**: `TabularInline` de `Breeding` (fk `filho`) dentro do form do Pal — cadastra as combinações direto na página do pal. Usar `autocomplete_fields = ["pai", "mae"]` para buscar por nome.
- Botão **"Importar/atualizar pals"** na listagem — dispara o `importar_pals` (equivalente ao "↻ Atualizar todos os preços" do whey).

## Frontend — interface temática

### Direção visual (tema Palworld)

- **Paleta**: azul-céu e verde-campo do jogo; azul e marrom-terroso da Pal Sphere; acentos por elemento (fogo laranja, água azul, planta verde, elétrico amarelo, gelo ciano, escuro roxo, dragão magenta, terra marrom, neutro cinza).
- **Tipografia**: fonte arredondada e "game-like" (ex.: Nunito/Baloo 2 via `next/font`).
- **Formas**: cantos bem arredondados, cards com borda grossa estilo UI de jogo, badges de tipo em pílula com a cor do elemento.
- Suporte a tema claro/escuro (ThemeToggle, como no whey).

### Home — Pals Descobertos (`app/page.jsx`, SSR)

- Grade responsiva de **PalSphere**: círculo estilizado como Pal Sphere com a foto do pal por cima, número do Paldeck (`#085`) e nome abaixo.
- Hover: esfera "balança" (animação CSS leve).
- Filtros client-side: por tipo (badges de elemento) e busca por nome.
- Contador de progresso: "132 / 172 descobertos" com barra de progresso.
- Opcional: exibir também os não descobertos como **silhueta escura/esfera fechada** com "???" — dá o efeito Pokédex e mostra o que falta.

### Detalhe do Pal (`app/pal/[key]/page.jsx`, SSR)

- Header: imagem grande, nome, número, badges de tipo.
- Stats: hp, ataque (melee/ranged), defesa, velocidades — barras horizontais coloridas.
- Suitability (trabalhos) e drops.
- **Seção Breeding**: lista das combinações cadastradas, cada linha no formato `[esfera pai] + [esfera mãe] = [esfera filho]`, com as fotos clicáveis levando ao detalhe de cada pal. Se vazio: "Nenhuma combinação registrada ainda."
- `generateMetadata` dinâmico + JSON-LD (prioridade SEO, mesmo padrão planejado no whey).
- `next/image` em todas as imagens.

### `lib/api.js`

Mesmo wrapper do whey: `${API_URL}/api/...` com `cache: 'no-store'`, `API_URL` default `http://localhost:8000`.

## Variáveis de ambiente (`api/.env`)

```
SECRET_KEY, DEBUG, ALLOWED_HOSTS
DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT
CORS_ALLOWED_ORIGINS
PALDEX_API_URL   # ex.: http://localhost:3000 (só usado pelo importar_pals)
```

Sem OAuth nem tokens que expiram — integração bem mais simples que a do ML no whey.

## Deploy (AWS EC2 — mesma instância do projeto-whey)

Mesmo pipeline do whey (GitHub Actions em push na `main`), mas em **portas separadas** pra não colidir
com o whey (que já ocupa 8000/3000 nesse EC2): gunicorn em **8001**, Next.js/pm2 (processo `paldeck-next`) em **3001**.
Domínio: `palword.endrioalberton.com.br`.

1. `git pull`
2. `cd site && npm install && npm run build && pm2 restart paldeck-next`
3. `cd api && pip install -r requirements.txt`
4. `python manage.py migrate --noinput && python manage.py collectstatic --noinput`
5. `sudo systemctl restart paldeck-api`

Ver [`deploy/README.md`](deploy/README.md) para o setup inicial completo (systemd, pm2, nginx, certbot) e
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) para o pipeline automático.

## Roadmap sugerido

1. **Fase 1 — Base**: scaffolding Django + Next, modelos, `importar_pals`, admin básico.
2. **Fase 2 — Descobertas**: fluxo de marcar descoberto por ID, home com grade de esferas.
3. **Fase 3 — Detalhe**: página do pal com stats e SEO.
4. **Fase 4 — Breeding**: cadastro no admin (inline) + seção de breeding no detalhe.
5. **Fase 5 — Polimento**: silhuetas de não descobertos, animações, barra de progresso, filtros por tipo.

## Limitações conhecidas

- **Dados dependem do repositório da API** — se o jogo lançar pals novos e o repo não atualizar, a importação fica defasada. Alternativa: editar o JSON local antes de importar.
- **Breeding manual** — o jogo tem regra determinística por `breeding_rank` (`⌊(rankA + rankB + 1)/2⌋` → filho de rank mais próximo), mas a proposta é cadastro manual pelo admin. Uma v2 pode sugerir combinações automaticamente usando o `breeding_rank` já importado.
- **Variantes de pal** (ex.: `085B` Relaxaurus Lux) usam `key` alfanumérica — por isso `key` é `CharField` e a rota do frontend usa `key`, não o id numérico.
