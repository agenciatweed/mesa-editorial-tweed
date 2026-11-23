# Mesa editorial: rotina econômica vigente

Autorização de Felipe em 23/11/2026. Este documento substitui as instruções anteriores de frequência, manutenção ampla e envio de artigos antigos. A execução é local, a cada **12 horas**, em conversa exclusiva da automação. Não carregar o histórico da conversa de implantação.

## 1. Triagem antes do trabalho editorial

Na pasta `H:\TweedMD\TweedEditorial`, execute **uma vez** `node scripts/round-summary.mjs INSTANTE_ISO`. Use `current_time_iso` do heartbeat; retomadas repetem a chave. Em pedido manual de rodada, use o instante da solicitação. Este comando faz tick idempotente, sync compacto, janela diária, check de pauta, sync/next do LinkedIn e triagem de links. Ele não redige nem publica.

Se needsWork:false, encerrar em silêncio. Com trabalho, abrir somente os documentos pertinentes à ação, respeitando os AGENTS.md dos dois projetos. Não imprimir pautas.json, catálogos com corpos completos, filas integrais ou todos os documentos em cada comando. Usar buscas e resultados pequenos. Os helpers processam os dados locais sem enviá-los integralmente ao modelo.

worker sync/list retornam contagens e IDs de pedidos editoriais, sem corpos nem os artigos aprovados que ainda aguardam. Para ler um pedido específico, `node scripts/worker.mjs show ID`; para assumi-lo, `claim ID`. Retomar jobs running com seus resultados existentes, sem duplicar trabalho. Manter Git e conteúdo concorrente; nenhum reset, force push, stash, segredo ou material de cliente.

## 2. Conteúdo e pauta

Para redigir/prompt, consultar diretrizes.md, especialistas.md, editorias.json e o índice de contexto autorizado. Ler os cinco artigos/prompts recentes pertinentes por trechos locais. Preservar títulos salvos, variar abertura, setores, porte, títulos e construção; não usar a fórmula Imagine uma pequena loja nem avisos de exemplo hipotético. Fontes primárias verificadas; fontes opcionais vazias não geram seção.

Entregar redação completa, fontes pertinentes, prompt literal em inglês terminando só em --ar 3:2 e imageAlt visual breve em português. Teal #08ffb1 em detalhe, luz suave e pele natural. Preservar prompts/capas/ALT preenchidos. worker complete entrega em Redação. Em action:prompt, só prompt e ALT vazio. Em Revisão, apenas keyword/slug/meta/FAQ derivado, preservando texto, título e capa; permanecer em Revisão. Nunca avançar etapas humanas.

Somente se pauta.shouldResearch:true, pesquisar UMA oportunidade recente verificável da selectedEdition. Menos publicações primeiro, empate pela pauta nova mais antiga; o helper revalida sob lock. Sem oportunidade pertinente, não fabricar. Usar o mesmo ISO em daily-pauta check/add, respeitar 10 cards, uma diária e a exceção de coluna vazia, no máximo uma sugestão por execução. submitted:false. Reavaliar check no fim se o processamento esvaziar a coluna. Diretrizes e AUTOMACAO detalham o formato.

## 3. Publicação diária

Publicar exclusivamente publication.job, no máximo **um artigo por dia de São Paulo**, mesmo com rodadas extras. Exigir Pronto/aprovação/snapshot/capa/ALT válidos. Ler AUTOMACAO.md e ../docs/PUBLICACAO.md somente quando houver publicação ou manutenção. Planos new-only: links naturais do novo para antigos (até quatro no corpo), dois relacionados; copiar todas as recomendações antigas e atualizar hash do catálogo. Consultar apenas candidatos pertinentes.

Dry-run, pré-verificação remota fresca, backup individual, upload temporário, renomeação e confirmação FTP/HTTP são obrigatórios. FTP normal 21/passivo, /www/, configuração existente e credencial do cofre. Nenhum espelhamento ou exclusão. Somente depois confirmar/arquivar em Artigos. Validar e conferir desktop/mobile. Journals existentes são retomáveis; nunca substituir por outro job.

## 4. LinkedIn: somente artigos novos

Após cada publicação e antes de encerrar, sync/next e seguir exclusivamente o elegível. **Acervo antigo pausado**, sem apagar fila nem rascunhos. No máximo um novo/dia; pendências novas continuam prioritárias, sem ultrapassar a quota. Com next:null, não abrir o navegador. Envio publishing/reconcile precisa ser conciliado antes de outro envio, inclusive se antigo.

Somente com elegível, ler LINKEDIN.md e usar Chrome conectado. Começar obrigatoriamente pela página administrativa da Agência Tweed 35563028, conferir identidade, depois abrir o draftUrl existente ou Escrever artigo. Mesmo título, corpo integral e capa original; legenda com título, Agência Tweed em texto simples e URL canônico. Conferir salvamento, texto integral, capa e legenda antes de publishing/Publicar. Confirmar sucesso, URLs reais e screenshot antes de confirm. Limite da plataforma interrompe a rodada, preservando draftUrl. Não repetir alertas iguais nem presumir envio após desconexão.

## 5. Links: pontual entre revisões amplas mensais

maintenance.reviewDue:true significa revisão ampla **a cada 30 dias**, não a cada dez rodadas. Uma revisão já pendente na migração continua pendente. Ler/acessar somente o escopo necessário; manutenção ampla segue o procedimento validado de AUTOMACAO. Depois de confirmação FTP/HTTP ou avaliação completa sem mudanças, link-cycle complete. Falha mantém pendente.

Nos demais dias, maintenance.focused contém apenas artigos novos ou alterados desde a última avaliação. Analisar os novos e candidatos antigos pertinentes para links de entrada e recomendações afetadas, sem reler todo o acervo. Se slugs vazio, pular. Preservar escolhas úteis e textos, até quatro links no corpo, relacionados separados. Para concluir a análise pontual, salvar evidência privada com catalogSha256, slugs, status confirmed ou no-changes e reason; `node scripts/focused-links.mjs complete ARQUIVO.json` revalida o escopo. confirmed somente após envio/FTP/HTTP; no-changes somente após avaliação real. Não marcar como avaliado por mera triagem.

## 6. Reaproveitar verificações sem perder segurança

Resultados ficam em .local, fora do Git. Cache de pesquisa/análise/validação local: manifest JSON com files (entradas usadas), context (critério/URLs/versões) e maxAgeHours (padrão 24; prazo explícito). `node scripts/verification-cache.mjs check NOME MANIFESTO.json` retorna inputSha256 e reuse. Com reuse:true, ler a evidência indicada, sem repetir o trabalho inalterado. Fonte com fato sujeito a mudança exige conferência atual; registro antigo não prova disponibilidade atual.

Depois de uma verificação efetiva, salvar evidência com status passed, inputSha256 retornado, checkedAt ISO real e detalhes/fontes/resultados; `record NOME MANIFESTO.json EVIDENCIA.json`. Alteração de entrada, prova ausente/alterada ou validade vencida impede reutilização. Nunca criar evidência sem realizar a verificação. Aprovações humanas, pré-verificação FTP/HTTP e confirmação real de envio não são cacheáveis. Reutilizar os journals e provas confirmadas para evitar duplicações, sem dispensar os guardas frescos do publicador.

## Encerramento

Commit/push restrito depois de entregas, publicações ou mudanças efetivas; confirmar o remoto. Não incluir .local, backups ou mudanças alheias. Comunicar apenas entregas, publicações e bloqueios novos acionáveis; sem trabalho significativo, silêncio. Não fazer novas tentativas de pesquisa ou navegador sem motivo. Não criar workers/agentes ou duplicar automações para uma rodada.
