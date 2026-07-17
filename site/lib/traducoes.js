// Rótulos fixos traduzidos pra exibição — os valores em inglês continuam sendo a
// chave interna (filtro, cor por tipo etc), só o texto mostrado muda.

export const TIPOS_PT = {
  neutral: 'Neutro',
  fire: 'Fogo',
  water: 'Água',
  grass: 'Planta',
  electric: 'Elétrico',
  ice: 'Gelo',
  ground: 'Terra',
  dark: 'Sombrio',
  dragon: 'Dragão',
}

export const TRABALHOS_PT = {
  kindling: 'Acender fogo',
  watering: 'Regar',
  planting: 'Plantio',
  'generating electricity': 'Gerar eletricidade',
  handiwork: 'Artesanato',
  gathering: 'Coleta',
  lumbering: 'Corte de madeira',
  mining: 'Mineração',
  'medicine production': 'Produção de remédios',
  cooling: 'Resfriamento',
  transporting: 'Transporte',
  farming: 'Agricultura',
}

export const TAMANHOS_PT = {
  'Extra Small': 'Extra pequeno',
  'Small': 'Pequeno',
  'Medium': 'Médio',
  'Large': 'Grande',
  'Extra Large': 'Extra grande',
}

export function traduzir(dict, chave) {
  if (!chave) return chave
  return dict[chave] ?? dict[chave.toLowerCase?.()] ?? chave
}
