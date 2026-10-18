# Operação a cada 5 horas — fluxo editorial por etapas (versão 2)

## Escopo

Painel: H:\TweedMD\TweedEditorial. Site estático: H:\TweedMD. Leia ambos os AGENTS.md, DESIGN.md e editorial/diretrizes.md, especialistas.md e editorias.json. Preservar o posicionamento e a identidade atuais. Não usar contexto pessoal, diagnósticos privados ou dados de clientes. Lorenzo/Mauro são diretrizes editoriais locais, não plugins nem bibliotecas disponíveis automaticamente.

Felipe autorizou processar as etapas salvas no painel, gerar conteúdo pelo GPT, fazer commit/push restrito e publicar os posts aprovados em Pronto. Não pedir aprovação novamente para um job e snapshot válidos. As sementes antigas continuam fora da fila até uma ação explícita de Salvar. Não integrar o blog ao menu/home institucional. Não publicar testes.

## Cadência e contador de manutenção

A tarefa roda a cada 5 horas. A partir desta mudança, a revisão dos artigos antigos acontece apenas na 10ª, 20ª, 30ª execução e assim por diante. Conte também rodadas sem fila, mas não conte leituras, dry-runs ou repetição da mesma execução.

No início de cada rodada real, rode `node scripts/link-cycle.mjs tick CHAVE`, usando `current_time_iso` do heartbeat como chave estável. Em execução manual solicitada pelo usuário, use uma chave única para essa solicitação. Retomadas usam a mesma chave. O contador privado em `.local/link-cycle.json` persiste entre rodadas. `status` consulta sem contar. `reviewDue:true` mantém a manutenção pendente até ser concluída; não a descarte se houver falha.

## Reconciliar a fila em cada rodada

1. Confira Git dos dois repositórios. Preserve edições concorrentes; não fazer stash/reset/force push nem alterar configurações globais de segurança. No pai, use `git -c safe.directory=H:/TweedMD` por comando se necessário. Concilie divergência remota antes de enviar, sem perder trabalho.
2. Execute `node scripts/worker.mjs sync` na pasta do painel. Esse comando cria/reconcilia jobs das etapas submetidas (`workflowVersion:2`, `submitted:true`) e devolve pending/running. Não submeta itens por conta própria. Sem mudanças ou trabalho, encerre em silêncio e sem commit vazio. Para uma segunda leitura sem gravações, use `worker.mjs list`.
3. Para um job pending de redigir/revisar/prompt, use `node scripts/worker.mjs claim ID`. Para um job running, retome somente aquele pedido e verifique resultados locais existentes; não gere trabalhadores duplicados. Os helpers comparam o conteúdo de entrada e impedem uma resposta obsoleta de sobrescrever edições humanas. Falhas não são reenviadas indefinidamente: o usuário pode pedir nova tentativa no painel.

## Pauta → redação automática → coluna Redação

O usuário já definiu título, editoria, voz, ângulo/tese, leitor e mudança de percepção. Não faça outra rodada de desenvolvimento de pauta nem mude essas decisões sem pedido.

Para `action:redigir`, leia o briefing, direção editorial e conteúdo público pertinente já publicado, evitando repetição. Use o GPT para escrever um artigo completo em português brasileiro, com tese clara, exemplos concretos e aplicação útil. Prefira 900–1.400 palavras apenas quando a tese justificar, sem enchimento. Não usar travessões, emojis ou títulos genéricos Introdução/Conclusão. Identifique exemplos hipotéticos. Para dados, estudos, cases ou citações, pesquise e acesse fontes primárias, sem inventar links, números ou citações. Não usar conteúdo privado.

Salve `.local/resultados/ID.json` com strings `body` (Markdown sem H1 repetido e sem seção FAQ), `sources` (campo opcional, com links verificados e notas quando necessários) e `prompt` (prompt Midjourney em inglês, somente o parâmetro --ar 3:2). O GPT desta rodada é o gerador, sem chave de API no navegador.

Execute `node scripts/worker.mjs complete ID .local/resultados/ID.json`. O helper salva os arquivos e move para **Redação**, com luz verde. Pare nessa etapa: Felipe editará texto/prompt e usará Salvar redação para avançar. Não envie automaticamente para Revisão.

## Redação sem prompt → completar apenas o prompt da capa

Toda rodada também identifica posts em Redação com corpo preenchido e prompt vazio, inclusive os rascunhos anteriores ao fluxo versão 2. Felipe autorizou expressamente completar esses prompts sem exigir Salvar pauta novamente. Não preencher prompts de posts vazios, não reescrever a redação, não substituir prompts já preenchidos e não avançar o post para Revisão.

Para `action:prompt`, leia o artigo completo e o briefing. Crie pelo GPT um único prompt Midjourney em inglês, com uma metáfora visual concreta alinhada à tese e sem texto/logos legíveis, terminando apenas com `--ar 3:2`, sem outros parâmetros. Salve `.local/resultados/ID.json` com a string `prompt` e use `worker.mjs complete ID arquivo.json`. O helper grava apenas o prompt e o status da automação; preserva corpo, Markdown, briefing, título, metadados SEO e a coluna Redação. Se o texto ou o prompt mudar durante o trabalho, a entrega fica obsoleta e não pode sobrescrever a edição humana. A luz fica verde depois de preencher.

## Revisão → metadados automáticos → permanece em Revisão

O texto já foi editado/aprovado na Redação. Para `action:revisar`, confira coerência, fontes e aderência ao posicionamento. Produza **somente metadados**, preservando título, corpo, editoria, voz e prompt. Se houver erro material no texto ou afirmação factual sem evidência necessária que não pode ser resolvida em metadados, sinalize a falha para revisão humana; não invente nem mude o texto silenciosamente.

Entregue `.local/resultados/ID.json` com strings:
- `keyword`: frase-chave de foco natural, alinhada ao texto e preferencialmente presente na abertura;
- `slug`: slug curto e descritivo, minúsculo e sem acentos, números/letras/hífens, sem colisão com home, blog, séries, artigos ou pastas do servidor;
- `meta`: metadescrição específica que contenha a frase-chave sem repetição artificial;
- `faq`: até três perguntas/respostas úteis derivadas do artigo, em blocos separados por linha em branco; cada bloco começa com pergunta e depois a resposta. Pode ficar vazio quando não agregar.

O FAQ pertence **exclusivamente ao JSON-LD**, não ao Markdown nem ao HTML visível. O publicador usa BlogPosting.hasPart com Question/Answer; não adiciona FAQPage nem promete rich results. Autor sempre Felipe Rijo; logo e URL do autor são fixos, sem perguntas ao usuário.

Execute `worker.mjs complete ID arquivo.json`. O post continua em **Revisão**, com luz verde. O usuário pode enviar a imagem e usar Salvar e manter em revisão sem aprovar nada. Somente Aprovar e enviar para Pronto autoriza a publicação após a revisão concluída. Não avance para Pronto nem marque critérios humanos. Editar corpo/briefing/fontes/prompt invalida a revisão e gera um novo passe; capa, descrição da capa e data não invalidam os metadados.

## Pronto → publicação → histórico em Artigos

Para cada `action:publicar`, verifique status Pronto, snapshot aprovado, revisão válida, capa local e descrição. O botão Salvar revisão e aprovar publicação registra a aprovação humana e os critérios editoriais, substituindo os quatro checkboxes antigos. Não aprovar pelo GPT. Se a data estiver vazia, o painel registra o dia da aprovação; data futura deve aguardar, sem alertar a cada hora.

Antes do dry-run, faça a análise de links descrita abaixo e prepare os dois planos. Execute `python scripts/publicar.py --job ID --links CAMINHO-PLANO-LINKS --related CAMINHO-PLANO-RELACIONADOS --dry-run`; só se passar, execute o mesmo comando sem --dry-run. O helper usa a credencial TweedEditorial/Kinghost no cofre do Windows, com transporte FTP normal na porta 21 e modo passivo. Nunca escrever senha em prompt, argumentos, arquivos ou Git.

O publicador gera a página no layout existente com BlogPosting, FAQ somente estruturado, autoria/datas/dimensões reais, breadcrumbs e links para a série. Atualiza capa, artigo, índice do blog, seção, sitemap e .htaccess estreito, quando necessário. Envia lista explícita, compara hashes antes de sobrescrever, guarda backup privado e verifica FTP/HTTP. Nunca espelhar/excluir a raiz FTP, tocar em pastas de clientes ou mudar a home institucional.

Somente após confirmação, publication.state=published e job.state=done são gravados. Isso faz o post sair das quatro colunas e aparecer apenas em **Artigos**, com texto, metadados, capa e link preservados. Não excluir o item ou os arquivos para arquivar. Não simular confirmação em produção. Para envio interrompido, retome o mesmo job e `.local/publicacoes/ID.json`; não apague o registro nem crie outro post.

## Links e recomendações: publicação leve e manutenção a cada 10 rodadas

Esta regra substitui a exigência anterior de analisar o acervo inteiro e editar artigos antigos em toda publicação. Trata-se dos links internos entre artigos do blog, não de adicionar referências externas.

### Em TODA publicação nova

Prepare os planos `--links` e `--related`, mas concentre a leitura GPT no novo texto e nos candidatos mais pertinentes. Pode usar a triagem local de `tools/analyze_internal_links.py` sem ler todos os parágrafos de todos os antigos: consulte primeiro títulos e candidatos relevantes. Não refaça a avaliação editorial de cada artigo antigo nesta etapa.

No plano de links use `version:1`, `scope:"new-only"`, `newSlug`, `contentSha256`, `modifiedAt` e `links`. Insira links naturais DO artigo novo PARA artigos existentes quando pertinentes, com `from`, `to`, `anchor` literal, `context` literal e `reason`. Não exigir link de entrada vindo de antigo nesta rodada. Lista vazia é permitida se não houver associação legítima. Não reescrever o corpo aprovado nem forçar links; máximo quatro links para artigos por corpo.

No plano de relacionados mantenha o formato completo validado pelo publicador e o `catalogSha256` atualizado, mas COPIE SEM ALTERAR todas as entradas antigas de `docs/leituras-relacionadas.json`, inclusive suas datas e razões. Acrescente apenas os dois destinos mais pertinentes para o novo artigo, com razão e data. Copiar entradas é operação local, não exige nova análise GPT. As duas recomendações finais ficam fora do limite de quatro links no corpo. O publicador rejeita mudanças em entradas antigas no escopo new-only.

Publique normalmente com dry-run e envio real, atualizando artigo, imagem, blog, seção, sitemap e rota. Preserve os HTML e recomendações dos artigos antigos. O efeito da borda da capa é herdado do template.

### Somente quando `link-cycle.mjs` devolver `reviewDue:true`

Faça a revisão ampla do acervo, incluindo os artigos publicados desde a última manutenção. Procure trechos naturais nos antigos para apontar aos recentes, respeitando a capacidade de quatro links; reavalie também os dois destinos de Continue a leitura de todos os artigos. Preserve escolhas que continuam pertinentes. Busque pelo menos um link antigo de entrada para cada publicação recente quando houver relação e capacidade; sem relação legítima, registre a limitação, sem fabricar âncoras.

Use relatórios de `tools/analyze_internal_links.py --new-slug SLUG` e planos históricos em `editorial/planos-links/` e `editorial/planos-relacionados/`. Para inserir links de entrada, use escopo `full` (padrão) com hash do conteúdo e ao menos um link antigo para o slug analisado. Aplique os planos pertinentes com `tools/update_internal_links.py --links PLANO --related PLANO --dry-run`, depois `--publish`. Em múltiplos planos, atualize-os sequencialmente contra os registros persistentes. Para manutenção apenas de recomendações, um plano `scope:"new-only"`, com lista vazia e hash válido de um artigo existente, permite ao helper de manutenção aplicar o plano de relacionados sem fabricar inserções.

Confirme os arquivos afetados por FTP/HTTP e só então rode `node scripts/link-cycle.mjs complete`. Se a revisão completa não encontrar mudanças legítimas, registre a avaliação privada e conclua o contador sem upload ou commit vazio. Se falhar, deixe pendente para retomada. Execute esta manutenção mesmo sem novos pedidos na fila quando o contador vencer; em rodada comum sem fila, encerre em silêncio.

Fontes e notas vazio ou só com espaços NÃO cria seção na página e NÃO impede publicação. Não invente notas para preencher campo. Dados, estudos e citações que efetivamente forem usados continuam exigindo verificação. Campo preenchido mantém a seção e as referências correspondentes.

## Falhas, validação e Git

Para falha de redação/revisão, salve uma explicação sem segredos em `.local/resultados/ID-erro.txt` e use `worker.mjs fail ID arquivo`. O card fica vermelho e oferece nova tentativa. Preserve resultados obsoletos para conciliação, sem sobrescrever trabalho humano.

Falha FTP/HTTP mantém a publicação retomável. Credencial indisponível, arquivo remoto divergente ou conflito real exigem interromper aquela publicação. Informe apenas bloqueios acionáveis e não repita alertas idênticos em toda rodada.

Quando mudar código, rode check-editorial.cjs, check-workflow.mjs e verificações de sintaxe. Após publicar, rode os validadores do site e confira desktop/mobile e links de retorno da página publicada.

Faça commit/push restrito após entregas ou publicações, verificando o commit remoto. No painel: studio, editorial, conteudos, scripts, referencias e documentos do projeto. No site: somente saídas do plano, ledger, miniaturas, manifesto e documentação envolvida. Não incluir .local, backups, segredos ou mudanças de outras tarefas. Se push falhar, preserve o commit e reporte; não republique o post já confirmado.

Reporte novas entregas e URLs publicadas, ou bloqueios que exigem ação. Sem trabalho ou mudança significativa, permaneça em silêncio. Não enviar mensagens a terceiros. A execução é local: computador ligado, internet e Codex aberto; não é um serviço em nuvem.


Acesso vigente desde 18/10/2026: FTP normal, porta 21, modo passivo, raiz remota `/www/`, configurado por `transport: "ftp"` em `editorial/integracao.json`. A credencial continua no cofre TweedEditorial/Kinghost; o nome histórico do helper credencial_sftp.py foi preservado. Não usar a raiz absoluta do SFTP no FTP. Não espelhar diretórios nem excluir arquivos para substituir: enviar temporário, verificar hash, renomear e confirmar FTP/HTTP antes de arquivar.
