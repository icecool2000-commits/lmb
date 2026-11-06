// Gera um torneio fictício completo (equipes, atletas, sorteio, jogos e estatísticas) para demonstração.
import * as C from "./torneio-core.js";

// gerador aleatório com semente: a mesma demo sai igual sempre
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const NOMES = ["Adriano","Bruno","Caio","Danilo","Eduardo","Fábio","Gustavo","Heitor","Igor","João","Kauã","Leandro","Marcelo","Nícolas","Otávio","Paulo","Rafael","Sérgio","Tiago","Vinícius","Wagner","Yuri","André","Beto","Cláudio","Diego","Émerson","Felipe","Gabriel","Hugo","Ivan","Júlio","Lucas","Mateus","Nelson","Osmar","Pedro","Renato","Samuel","Túlio","Ulisses","Vitor","Willian","Alex","Breno","César","Davi","Enzo","Flávio","Guilherme","Henrique","Isaque","Jonas","Léo","Murilo","Nando","Orlando","Pietro","Ronaldo","Saulo","Teo","Valter","Xande","Zeca","Álvaro","Bento","Cristiano","Douglas","Elias","Fernando","Geraldo","Hélio","Ítalo","Jairo","Kleber","Luan","Márcio","Natan","Oscar","Paulinho","Rodrigo","Silvio","Thiago","Vagner"];
const SOBRE = ["Silva","Souza","Oliveira","Santos","Lima","Pereira","Costa","Ribeiro","Alves","Carvalho","Gomes","Martins","Rocha","Barbosa","Moreira","Teixeira","Freitas","Mendes","Cardoso","Nunes"];
const EQ_BIRIBOL = ["Tubarões da AEM","Piratas do Lago","Golfinhos Mococa","Arraias FC","Marlins","Orcas","Lontras","Baleias Azuis"];
const EQ_BASQUETE = ["Dinos","Raptors Mococa","Trovões","Falcões","Lobos da AEM","Panteras","Gaviões","Tigres","Corujas","Leões do Vale"];

export function gerarDemo(esporte, nomeDemo) {
  const BIR = esporte === "biribol", R = rng(BIR ? 2026 : 1977);
  const int = (a, b) => a + Math.floor(R() * (b - a + 1));
  const nEq = BIR ? 8 : 10, nAt = BIR ? 8 : 10;
  let ni = 0;
  const equipes = (BIR ? EQ_BIRIBOL : EQ_BASQUETE).slice(0, nEq).map((nome, e) => {
    const nums = C.embaralhar(Array.from({ length: 30 }, (_, i) => i + 1), R).slice(0, nAt).sort((a, b) => a - b);
    return { id: "demo-e" + e, nome, atletas: nums.map((num, k) => ({ id: "demo-e" + e + "a" + k, num, nome: NOMES[(ni++ * 7) % NOMES.length] + " " + SOBRE[(e * 3 + k) % SOBRE.length][0] + "." })) };
  });
  // força de cada equipe e de cada atleta (para os resultados fazerem sentido)
  const forca = {}; equipes.forEach((e, i) => forca[e.id] = 1 - i * 0.05 + R() * 0.25);
  const peso = {}; equipes.forEach(e => e.atletas.forEach((a, k) => peso[a.id] = k < 3 ? 3 + R() * 3 : k < 6 ? 1 + R() * 2 : 0.2 + R()));

  const etapas = [
    { id: "demo-s1", nome: "1ª etapa", local: "AEM", data: "2026-11-21", hora: BIR ? "19:00" : "10:00", grupos: [], classificam: 2, sorteio: "auto" },
    { id: "demo-s2", nome: "2ª etapa", local: "AEM", data: "2026-12-12", hora: BIR ? "19:00" : "10:00", grupos: [], classificam: null, sorteio: "direto" }];

  const jogos = [];
  let extremosFeitos = { max: false, min: false };
  const vence = (a, b) => R() < forca[a] / (forca[a] + forca[b]);

  // distribui os pontos de uma equipe entre os atletas
  function distribuir(eq, pontos, st, valores) {
    const ats = eq.atletas, tot = ats.reduce((s, a) => s + peso[a.id], 0);
    let resta = pontos;
    while (resta > 0) {
      let r = R() * tot, alvo = ats[0];
      for (const a of ats) { r -= peso[a.id]; if (r <= 0) { alvo = a; break; } }
      const v = valores ? Math.min(resta, valores[Math.floor(R() * valores.length)]) : 1;
      const x = st[alvo.id] || (st[alvo.id] = { p: 0, b: 0, as: 0 });
      x.p += v; resta -= v;
    }
  }
  const eqDe = id => equipes.find(e => e.id === id);

  function jogarBiribol(j, forcarVencedor) {
    const sets = []; let sa = 0, sb = 0;
    const venceJogo = forcarVencedor ? forcarVencedor === j.a : vence(j.a, j.b);
    while (sa < 2 && sb < 2) {
      const i = sets.length, alvo = i < 2 ? 21 : 15;
      // quem leva o set: tende ao vencedor do jogo, mas pode virar
      let ladoA = R() < (venceJogo ? 0.7 : 0.3);
      if ((ladoA && sa === 1 && !venceJogo) || (!ladoA && sb === 1 && venceJogo)) ladoA = !ladoA;
      let w = alvo, l = int(i < 2 ? 8 : 6, alvo - 2);
      if (R() < 0.18) { w = alvo + int(1, 3); l = w - 2; } // disputa na vantagem (20x20 ou 14x14)
      if (!extremosFeitos.min && i === 0) { w = 21; l = 5; extremosFeitos.min = true; } // menor pontuação: 5
      if (!extremosFeitos.max && i === 2) { w = 30; l = 28; extremosFeitos.max = true; } // tiebreak até 30
      sets.push(ladoA ? { a: w, b: l } : { a: l, b: w });
      ladoA ? sa++ : sb++;
    }
    j.sets = sets; j.status = "encerrado";
    const st = {}; const pa = sets.reduce((s, x) => s + x.a, 0), pb = sets.reduce((s, x) => s + x.b, 0);
    distribuir(eqDe(j.a), Math.round(pa * 0.85), st); distribuir(eqDe(j.b), Math.round(pb * 0.85), st); // ~15% vêm de erro do adversário
    extrasStats(j, st); j.stats = st;
    j.venc = C.resultadoBiribol(j).venc;
  }

  function jogarBasquete(j, mata) {
    let ta = Math.round(50 + forca[j.a] * 22 + (R() - 0.5) * 26), tb = Math.round(50 + forca[j.b] * 22 + (R() - 0.5) * 26);
    ta = Math.max(24, Math.min(97, ta)); tb = Math.max(24, Math.min(97, tb));
    if (!extremosFeitos.max) { ta = 100; extremosFeitos.max = true; }          // maior pontuação: 100
    else if (!extremosFeitos.min) { tb = 20; extremosFeitos.min = true; }      // menor pontuação: 20
    else if (!mata && R() < 0.15) tb = ta;                                      // empate na classificação
    let forcaExtra = null;
    if (mata && !extremosFeitos.prorrog) { tb = ta; forcaExtra = "P"; extremosFeitos.prorrog = true; }   // um jogo com prorrogação
    else if (mata && !extremosFeitos.bo) { tb = ta; forcaExtra = "BO"; extremosFeitos.bo = true; }        // um jogo na bola de ouro
    const quartos = t => { const q = [0, 0, 0, 0]; for (let p = 0; p < t; p++) q[Math.floor(R() * 4)]++; return q; };
    const qa = quartos(ta), qb = quartos(tb);
    j.periodos = [0, 1, 2, 3].map(i => ({ n: (i + 1) + "Q", a: qa[i], b: qb[i] }));
    if (mata && ta === tb) {
      if (forcaExtra === "P" || (!forcaExtra && R() < 0.6)) { const pa = int(4, 10); j.periodos.push({ n: "P1", a: pa, b: pa + (R() < 0.5 ? 2 : -2) }); }
      else { j.periodos.push({ n: "P1", a: 6, b: 6 }); j.periodos.push(R() < 0.5 ? { n: "BO", a: 2, b: 0 } : { n: "BO", a: 0, b: 2 }); }
    }
    const A = j.periodos.reduce((s, p) => s + p.a, 0), B = j.periodos.reduce((s, p) => s + p.b, 0);
    j.status = "encerrado";
    const st = {}; distribuir(eqDe(j.a), A, st, [1, 2, 2, 2, 3]); distribuir(eqDe(j.b), B, st, [1, 2, 2, 2, 3]);
    extrasStats(j, st); j.stats = st;
    j.venc = C.resultadoBasquete(j).venc;
  }

  function extrasStats(j, st) {
    [j.a, j.b].forEach(id => eqDe(id).atletas.forEach(a => {
      const x = st[a.id] || (st[a.id] = { p: 0, b: 0, as: 0 });
      x.b += R() < 0.35 ? int(1, BIR ? 3 : 2) : 0; x.as += R() < 0.5 ? int(1, BIR ? 4 : 5) : 0;
    }));
  }
  const jogar = (j, mata) => BIR ? jogarBiribol(j) : jogarBasquete(j, mata);

  // ---- 1ª etapa: grupos + mata-mata ----
  const ids = C.embaralhar(equipes.map(e => e.id), R);
  const nG = C.sugerirGrupos(nEq), grupos = C.distribuir(ids, nG);
  etapas[0].grupos = C.gruposParaSalvar(grupos); etapas[0].classificam = C.sugerirClassificados(nEq, nG);
  let ordem = 0;
  grupos.forEach((g, gi) => C.todosContraTodos(g).forEach((par, r) => par.forEach(([a, b], o) => {
    const j = { id: "demo-j" + (ordem++), etapa: 0, fase: "grupo", grupo: gi, rodada: r + 1, ordem: o, a, b, faseNome: "Grupo " + C.letraGrupo(gi), stats: {} };
    jogar(j, false); jogos.push(j);
  })));
  const nomeDe = id => eqDe(id).nome;
  const porGrupo = grupos.map((g, gi) => C.classificacao(esporte, g, jogos.filter(j => j.etapa === 0 && j.grupo === gi), nomeDe).slice(0, etapas[0].classificam));
  mataMata(0, C.ordenarQualificados(porGrupo));
  // ---- 2ª etapa: mata-mata direto (ordem de campanha da 1ª etapa) ----
  const camp = C.classificacao(esporte, equipes.map(e => e.id), jogos, nomeDe);
  mataMata(1, camp.map((r, i) => ({ eid: r.eid, grupo: null, pos: i + 1 })));

  function mataMata(ei, qual) {
    const pares = C.primeiraRodada(qual); let ant = [], rodada = 1;
    pares.forEach(([x, y], o) => {
      const a = x ? x.eid : null, b = y ? y.eid : null;
      const j = { id: "demo-j" + (ordem++), etapa: ei, fase: "mata", rodada, ordem: o, a: a || b, b: a && b ? b : null, faseNome: C.nomeFase(pares.length), stats: {} };
      if (!a || !b) { j.wo = a || b; j.status = "encerrado"; j.venc = j.wo; if (BIR) j.sets = []; else j.periodos = []; }
      else jogar(j, true);
      ant.push(j); jogos.push(j);
    });
    while (ant.length > 1) {
      rodada++; const prox = [];
      for (let i = 0; i < ant.length; i += 2) {
        const j = { id: "demo-j" + (ordem++), etapa: ei, fase: "mata", rodada, ordem: i / 2, a: ant[i].venc, b: ant[i + 1].venc, de: [ant[i].id, ant[i + 1].id], faseNome: C.nomeFase(ant.length / 2), stats: {} };
        jogar(j, true); prox.push(j); jogos.push(j);
      }
      ant = prox;
    }
  }

  const torneio = { nome: "[DEMO] " + (nomeDemo || (BIR ? "Copa Biribol Mococa" : "Copa Família Basquete Mococa")), demo: true, equipes, etapas, criado: Date.now() };
  return { torneio, jogos: jogos.map(j => ({ ...j, criado: Date.now() })) };
}
