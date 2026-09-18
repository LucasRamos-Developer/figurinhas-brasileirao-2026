// Dados do álbum Panini Brasileirão 2026 (Livro Ilustrado Oficial — Séries A e B).
// Estrutura conferida contra a descrição oficial do produto (reconcilia
// exatamente com os 512 anunciados: 380 Série A + 60 Série B + 72 especiais
// = 512; 40 holográficas = 20 escudos Série A + 20 escudos Série B; 20 corte
// especial = os 20 Mascotes).
//
// Esquema de identificação de cada figurinha:
// - Jogadores/painéis: numeração ÚNICA E CONTÍNUA, sem prefixo de time —
//   Série A (1..360), Série B (361..400), São Eles!/Jogão/Homens-Gol/
//   Feminino (401..450).
// - Escudo holográfico: prefixo "E" + número corrido cruzando as duas séries
//   (E1..E20 Série A, E21..E40 Série B).
// - Abertura (escudo da CBF + troféu da Série A) e Mascotes (corte especial,
//   seção própria — não é por time) usam código curto + numeração local
//   (CB1..CB2, MAS1..MAS20).
// - Cards (colecionável à parte, não se cola no álbum): cada categoria tem
//   seu próprio prefixo + numeração local (PC1..PC6, EST1..EST44, etc.).
const PLAYERS_PER_TEAM = 18;

const SECTIONS = [
  { title: 'Série A', teams: [
    { name: 'Flamengo', code: 'FLA', color: '#C8102E', playerStart: 1, shieldNumber: 1 },
    { name: 'Palmeiras', code: 'PAL', color: '#006437', playerStart: 19, shieldNumber: 2 },
    { name: 'Cruzeiro', code: 'CRU', color: '#003399', playerStart: 37, shieldNumber: 3 },
    { name: 'Mirassol', code: 'MIR', color: '#FFC400', playerStart: 55, shieldNumber: 4 },
    { name: 'Fluminense', code: 'FLU', color: '#7A0C2E', playerStart: 73, shieldNumber: 5 },
    { name: 'Botafogo', code: 'BOT', color: '#262626', playerStart: 91, shieldNumber: 6 },
    { name: 'Bahia', code: 'BAH', color: '#0055A4', playerStart: 109, shieldNumber: 7 },
    { name: 'São Paulo', code: 'SAO', color: '#C10000', playerStart: 127, shieldNumber: 8 },
    { name: 'Grêmio', code: 'GRE', color: '#0A5FA8', playerStart: 145, shieldNumber: 9 },
    { name: 'Red Bull Bragantino', code: 'RBB', color: '#E30613', playerStart: 163, shieldNumber: 10 },
    { name: 'Atlético Mineiro', code: 'CAM', color: '#1A1A1A', playerStart: 181, shieldNumber: 11 },
    { name: 'Santos', code: 'SAN', color: '#1A1A1A', playerStart: 199, shieldNumber: 12 },
    { name: 'Corinthians', code: 'COR', color: '#111111', playerStart: 217, shieldNumber: 13 },
    { name: 'Vasco da Gama', code: 'VAS', color: '#0D0D0D', playerStart: 235, shieldNumber: 14 },
    { name: 'Vitória', code: 'VIT', color: '#B22222', playerStart: 253, shieldNumber: 15 },
    { name: 'Internacional', code: 'INT', color: '#D81E2C', playerStart: 271, shieldNumber: 16 },
    { name: 'Coritiba', code: 'CFC', color: '#0F8A3B', playerStart: 289, shieldNumber: 17 },
    { name: 'Athletico Paranaense', code: 'CAP', color: '#CC0000', playerStart: 307, shieldNumber: 18 },
    { name: 'Chapecoense', code: 'CHA', color: '#0B6E4F', playerStart: 325, shieldNumber: 19 },
    { name: 'Remo', code: 'REM', color: '#0033A0', playerStart: 343, shieldNumber: 20 },
  ]},
  { title: 'Série B', teams: [
    { name: 'Ceará', code: 'CEA', color: '#1A1A1A', playerStart: 361, playerCount: 2, shieldNumber: 21 },
    { name: 'Fortaleza', code: 'FOR', color: '#003DA5', playerStart: 363, playerCount: 2, shieldNumber: 22 },
    { name: 'Juventude', code: 'JUV', color: '#1B5E20', playerStart: 365, playerCount: 2, shieldNumber: 23 },
    { name: 'Sport', code: 'SPT', color: '#A6192E', playerStart: 367, playerCount: 2, shieldNumber: 24 },
    { name: 'Criciúma', code: 'CRI', color: '#FFC107', playerStart: 369, playerCount: 2, shieldNumber: 25 },
    { name: 'Goiás', code: 'GOI', color: '#0F8A3B', playerStart: 371, playerCount: 2, shieldNumber: 26 },
    { name: 'Novorizontino', code: 'NOV', color: '#D32F2F', playerStart: 373, playerCount: 2, shieldNumber: 27 },
    { name: 'CRB', code: 'CRB', color: '#D32F2F', playerStart: 375, playerCount: 2, shieldNumber: 28 },
    { name: 'Avaí', code: 'AVA', color: '#0A4DA1', playerStart: 377, playerCount: 2, shieldNumber: 29 },
    { name: 'Cuiabá', code: 'CUI', color: '#2E7D32', playerStart: 379, playerCount: 2, shieldNumber: 30 },
    { name: 'Atlético Goianiense', code: 'ACG', color: '#B7141F', playerStart: 381, playerCount: 2, shieldNumber: 31 },
    { name: 'Operário-PR', code: 'OPE', color: '#2E7D32', playerStart: 383, playerCount: 2, shieldNumber: 32 },
    { name: 'Vila Nova', code: 'VNO', color: '#C1272D', playerStart: 385, playerCount: 2, shieldNumber: 33 },
    { name: 'América-MG', code: 'AME', color: '#1B7B3A', playerStart: 387, playerCount: 2, shieldNumber: 34 },
    { name: 'Athletic Club', code: 'ATH', color: '#C8102E', playerStart: 389, playerCount: 2, shieldNumber: 35 },
    { name: 'Botafogo-SP', code: 'BSP', color: '#E0112F', playerStart: 391, playerCount: 2, shieldNumber: 36 },
    { name: 'São Bernardo', code: 'SBE', color: '#C62828', playerStart: 393, playerCount: 2, shieldNumber: 37 },
    { name: 'Londrina', code: 'LON', color: '#C62828', playerStart: 395, playerCount: 2, shieldNumber: 38 },
    { name: 'Náutico', code: 'NAU', color: '#B71C1C', playerStart: 397, playerCount: 2, shieldNumber: 39 },
    { name: 'Ponte Preta', code: 'PON', color: '#1A1A1A', playerStart: 399, playerCount: 2, shieldNumber: 40 },
  ]},
  { title: 'Especiais', teams: [
    // Abertura + São Eles! + Jogão + Homens-Gol dividem UMA numeração
    // contínua sob o prefixo "CB" (CB1..CB34 — 2+11+11+10), sem reiniciar
    // entre seções. Ordem interna (onde cada seção começa) ainda não foi
    // 100% confirmada com figurinha física — só a faixa total (1-34) e os
    // números que o usuário já tem batem com essa divisão.
    { name: 'Abertura Institucional', code: 'AB', color: '#FFCC00', playerStart: 1, playerCount: 2, numberPrefix: 'CB', shield: false },
    { name: 'São Eles!', code: 'SEL', color: '#009688', playerStart: 3, playerCount: 11, numberPrefix: 'CB', shield: false },
    { name: 'Jogão', code: 'JOG', color: '#6A4C93', playerStart: 14, playerCount: 11, numberPrefix: 'CB', shield: false },
    { name: 'Homens-Gol', code: 'HGL', color: '#FF5722', playerStart: 25, playerCount: 10, numberPrefix: 'CB', shield: false },
    { name: 'Mascotes', code: 'M', color: '#F4A300', stickerCount: 20, shield: false },
    { name: 'Brasileirão Feminino', code: 'FEM', color: '#E91E63', playerStart: 401, playerCount: 18, shield: false },
  ]},
  // Cards são um colecionável à parte das figurinhas (vem 1 por envelope,
  // não se cola no álbum) — 98 no total, em 6 categorias, cada uma com seu
  // próprio prefixo e numeração local (ex: PC1..PC6), sem cruzar com a
  // numeração das figurinhas.
  { title: 'Cards', teams: [
    { name: 'Prata da Casa', code: 'PC', color: '#B0BEC5', stickerCount: 6, shield: false },
    { name: 'Estrela', code: 'EST', color: '#FFD700', stickerCount: 44, shield: false },
    { name: 'Luva Dourada', code: 'LD', color: '#DAA520', stickerCount: 14, shield: false },
    { name: 'Ídolo', code: 'IDO', color: '#9C27B0', stickerCount: 14, shield: false },
    { name: 'Top Player', code: 'TP', color: '#2196F3', stickerCount: 12, shield: false },
    { name: 'Legend', code: 'LEG', color: '#FF6F00', stickerCount: 8, shield: false },
  ]},
];

// Seções sem `stickerCount`/`playerStart` explícito usam este padrão.
const DEFAULT_STICKER_COUNT = 3;
