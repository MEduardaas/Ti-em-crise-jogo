// Siglas explicadas em tooltips (componente <Sigla />) e no menu "Como jogar".
// Mantemos poucas siglas de propósito: o jogo é para quem está começando.
export const GLOSSARIO: Record<string, { nome: string; texto: string }> = {
  SLA: {
    nome: 'Acordo de Nível de Serviço',
    texto: 'O prazo combinado com o cliente. No jogo: quantas horas a equipe tem para conter o incidente, conforme a prioridade.',
  },
  CAB: {
    nome: 'Comitê de Mudanças',
    texto: 'Change Advisory Board: o grupo que avalia o risco de uma mudança antes de ela entrar em produção. No jogo, a correção vale na hora seguinte.',
  },
  CMDB: {
    nome: 'Base de Dados de Configuração',
    texto: 'O registro dos serviços e de quem depende de quem. No jogo, é o mapa de serviços: as falhas se espalham pelas setas.',
  },
  P1: { nome: 'Serviço crítico', texto: 'Impacto alto. Conta 3× na saúde geral. Meta: saúde ≥ 90% (no mercado, equivale a 99,9% de disponibilidade).' },
  P2: { nome: 'Serviço importante', texto: 'Impacto médio. Conta 2× na saúde geral. Meta: saúde ≥ 80% (no mercado, 99,5% de disponibilidade).' },
  P3: { nome: 'Serviço de suporte', texto: 'Impacto baixo. Conta 1× na saúde geral. Meta: saúde ≥ 70% (no mercado, 99% de disponibilidade).' },
  ITIL: {
    nome: 'Information Technology Infrastructure Library',
    texto: 'Um conjunto de boas práticas para gerenciar serviços de TI. O jogo usa práticas da versão 4.',
  },
  OWASP: {
    nome: 'Open Worldwide Application Security Project',
    texto: 'Comunidade que publica a lista das falhas de segurança mais comuns em sistemas web (o "Top 10").',
  },
}

export const REGEX_SIGLAS = new RegExp(`\\b(${Object.keys(GLOSSARIO).join('|')})\\b`, 'g')
