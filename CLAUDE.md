# Liga Metropolitana de Biribol (LMB) – app de torneios

- App estático (PWA) no GitHub Pages (branch main), só com o modo Torneio. Identidade: azul-marinho #0b2554, azul piscina #1597dc, amarelo #f6d20b; logo em `logo.png` (círculo recortado do cartaz), topo com `fundo-topo.jpg`.
- Mesmo projeto Firebase dos apps Biribol e Basquete (`biribol-mococa`, plano Spark). Coleção `lmb_torneios/{id}` + subcoleção `jogos`. `firestore.rules` é compartilhado pelos 3 apps e publicado à mão no console.
- `torneio.js`, `torneio-core.js`, `torneio-demo.js`, `exportar.js`, `torneio.css`, `acesso.js` são IGUAIS nos 3 repositórios (biribol, basquete, lmb): mudou em um, copie para os outros.
- Regras do biribol: melhor de 3 sets (21, 21, tiebreak 15, 2 de vantagem), até 8 atletas por equipe. Desempate: vitórias, saldo, pontos feitos.
- Firestore não aceita lista dentro de lista: grupos salvos como [{equipes:[...]}].
- Exportações (`exportar.js`): tabela de jogos e relatório completo em PDF (jsPDF + AutoTable) e Excel (ExcelJS), bibliotecas do cdnjs carregadas só ao exportar. Cores e logo vêm de `marca` no index.html.
- Organizador: icecool2000@gmail.com (config.js + firestore.rules). Editores criados na tela "Editores" (coleção `editores`, compartilhada pelos 3 apps).
- A cada mudança, subir a versão do cache em `sw.js` (const C).
- Formato da Liga (`formatoSeries:true` no index.html): os 3 primeiros de cada grupo vão para as séries — 1ºs na Série Ouro, 2ºs na Prata, 3ºs na Bronze (`etapa.formato = "series"`, `etapa.series = [{equipes, tipo}]`). Disputa em cada série: 2 equipes = final; 3 = todos contra todos; 4+ = mata-mata com semifinal, final e 3º lugar (ou "sempre todos contra todos" via `disputaSeries`). Jogos das séries têm `serie` (0/1/2); mata-mata delas usa `fase:"mata"`, todos contra todos usa `fase:"serie"`. Cada série dá medalhas de ouro, prata e bronze.
- Demonstração da Liga: 24 equipes, 8 grupos de 3, duas etapas completas (séries de 8 com quartas, semi, 3º lugar e final).
