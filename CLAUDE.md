# Liga Metropolitana de Biribol (LMB) – app de torneios

- App estático (PWA) no GitHub Pages (branch main), só com o modo Torneio. Identidade: azul-marinho #0b2554, azul piscina #1597dc, amarelo #f6d20b; logo em `logo.png` (círculo recortado do cartaz), topo com `fundo-topo.jpg`.
- Mesmo projeto Firebase dos apps Biribol e Basquete (`biribol-mococa`, plano Spark). Coleção `lmb_torneios/{id}` + subcoleção `jogos`. `firestore.rules` é compartilhado pelos 3 apps e publicado à mão no console.
- `torneio.js`, `torneio-core.js`, `torneio-demo.js`, `exportar.js`, `torneio.css`, `acesso.js` são IGUAIS nos 3 repositórios (biribol, basquete, lmb): mudou em um, copie para os outros.
- Regras do biribol: melhor de 3 sets (21, 21, tiebreak 15, 2 de vantagem), até 8 atletas por equipe. Desempate: vitórias, saldo, pontos feitos.
- Firestore não aceita lista dentro de lista: grupos salvos como [{equipes:[...]}].
- Exportações (`exportar.js`): tabela de jogos e relatório completo em PDF (jsPDF + AutoTable) e Excel (ExcelJS), bibliotecas do cdnjs carregadas só ao exportar. Cores e logo vêm de `marca` no index.html.
- Organizador: icecool2000@gmail.com (config.js + firestore.rules). Editores criados na tela "Editores" (coleção `editores`, compartilhada pelos 3 apps).
- A cada mudança, subir a versão do cache em `sw.js` (const C).
