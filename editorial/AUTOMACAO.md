# Operação horária — fluxo editorial por etapas (versão 2)

## Escopo

Painel: H:\TweedMD\TweedEditorial. Site estático: H:\TweedMD. Leia ambos os AGENTS.md, DESIGN.md e editorial/diretrizes.md, especialistas.md e editorias.json. Preservar o posicionamento e a identidade atuais. Não usar contexto pessoal, diagnósticos privados ou dados de clientes. Lorenzo/Mauro são diretrizes editoriais locais, não plugins nem bibliotecas disponíveis automaticamente.

Felipe autorizou processar as etapas salvas no painel, gerar conteúdo pelo GPT, fazer commit/push restrito e publicar os posts aprovados em Pronto. Não pedir aprovação novamente para um job e snapshot válidos. As sementes antigas continuam fora da fila até uma ação explícita de Salvar. Não integrar o blog ao menu/home institucional. Não publicar testes.

## Reconciliar a fila em cada rodada

1. Confira Git dos dois repositórios. Preserve edições concorrentes; não fazer stash/reset/force push nem alterar configurações globais de segurança. No pai, use `git -c safe.directory=H:/TweedMD` por comando se necessário. Concilie divergência remota antes de enviar, sem perder trabalho.
2. Execute `node scripts/worker.mjs sync` na pasta do painel. Esse comando cria/reconcilia jobs das etapas submetidas (`workflowVersion:2`, `submitted:true`) e devolve pending/running. Não submeta itens por conta própria. Sem mudanças ou trabalho, encerre em silêncio e sem commit vazio. Para uma segunda leitura sem gravações, use `worker.mjs list`.
3. Para um job pending de redigir/revisar, use `node scripts/worker.mjs claim ID`. Para um job running, retome somente aquele pedido e verifique resultados locais existentes; não gere trabalhadores duplicados. Os helpers comparam o conteúdo de entrada e impedem uma resposta obsoleta de sobrescrever edições humanas. Falhas não são reenviadas indefinidamente: o usuário pode pedir nova tentativa no painel.

## Pauta → redação automática → coluna Redação

O usuário já definiu título, editoria, voz, ângulo/tese, leitor e mudança de percepção. Não faça outra rodada de desenvolvimento de pauta nem mude essas decisões sem pedido.

Para `action:redigir`, leia o briefing, direção editorial e conteúdo público pertinente já publicado, evitando repetição. Use o GPT para escrever um artigo completo em português brasileiro, com tese clara, exemplos concretos e aplicação útil. Prefira 900–1.400 palavras apenas quando a tese justificar, sem enchimento. Não usar travessões, emojis ou títulos genéricos Introdução/Conclusão. Identifique exemplos hipotéticos. Para dados, estudos, cases ou citações, pesquise e acesse fontes primárias, sem inventar links, números ou citações. Não usar conteúdo privado.

Salve `.local/resultados/ID.json` com strings `body` (Markdown sem H1 repetido e sem seção FAQ), `sources` (links verificados e notas) e `prompt` (prompt Midjourney em inglês, somente o parâmetro --ar 3:2). O GPT desta rodada é o gerador, sem chave de API no navegador.

Execute `node scripts/worker.mjs complete ID .local/resultados/ID.json`. O helper salva os arquivos e move para **Redação**, com luz verde. Pare nessa etapa: Felipe editará texto/prompt e usará Salvar redação para avançar. Não envie automaticamente para Revisão.

## Revisão → metadados automáticos → permanece em Revisão

O texto já foi editado/aprovado na Redação. Para `action:revisar`, confira coerência, fontes e aderência ao posicionamento. Produza **somente metadados**, preservando título, corpo, editoria, voz e prompt. Se houver erro material no texto ou fonte insuficiente que não pode ser resolvido em metadados, sinalize a falha para revisão humana; não invente nem mude o texto silenciosamente.

Entregue `.local/resultados/ID.json` com strings:
- `keyword`: frase-chave de foco natural, alinhada ao texto e preferencialmente presente na abertura;
- `slug`: slug curto e descritivo, minúsculo e sem acentos, números/letras/hífens, sem colisão com home, blog, séries, artigos ou pastas do servidor;
- `meta`: metadescrição específica que contenha a frase-chave sem repetição artificial;
- `faq`: até três perguntas/respostas úteis derivadas do artigo, em blocos separados por linha em branco; cada bloco começa com pergunta e depois a resposta. Pode ficar vazio quando não agregar.

O FAQ pertence **exclusivamente ao JSON-LD**, não ao Markdown nem ao HTML visível. O publicador usa BlogPosting.hasPart com Question/Answer; não adiciona FAQPage nem promete rich results. Autor sempre Felipe Rijo; logo e URL do autor são fixos, sem perguntas ao usuário.

Execute `worker.mjs complete ID arquivo.json`. O post continua em **Revisão**, com luz verde. O usuário enviará a imagem e salvará a revisão para aprovar Pronto. Não avance para Pronto nem marque critérios humanos. Editar corpo/briefing/fontes/prompt invalida a revisão e gera um novo passe; capa, descrição da capa e data não invalidam os metadados.

## Pronto → publicação → histórico em Artigos

Para cada `action:publicar`, verifique status Pronto, snapshot aprovado, revisão válida, capa local e descrição. O botão Salvar revisão e aprovar publicação registra a aprovação humana e os critérios editoriais, substituindo os quatro checkboxes antigos. Não aprovar pelo GPT. Se a data estiver vazia, o painel registra o dia da aprovação; data futura deve aguardar, sem alertar a cada hora.

Execute `python scripts/publicar.py --job ID --dry-run`; só se passar, execute o mesmo comando sem --dry-run. O helper usa a credencial TweedEditorial/Kinghost no cofre do Windows e a chave SSH fixada. Nunca escrever senha em prompt, argumentos, arquivos ou Git.

O publicador gera a página no layout existente com BlogPosting, FAQ somente estruturado, autoria/datas/dimensões reais, breadcrumbs e links para a série. Atualiza capa, artigo, índice do blog, seção, sitemap e .htaccess estreito, quando necessário. Envia lista explícita, compara hashes antes de sobrescrever, guarda backup privado e verifica SFTP/HTTP. Nunca espelhar/excluir a raiz FTP, tocar em pastas de clientes ou mudar a home institucional.

Somente após confirmação, publication.state=published e job.state=done são gravados. Isso faz o post sair das quatro colunas e aparecer apenas em **Artigos**, com texto, metadados, capa e link preservados. Não excluir o item ou os arquivos para arquivar. Não simular confirmação em produção. Para envio interrompido, retome o mesmo job e `.local/publicacoes/ID.json`; não apague o registro nem crie outro post.

## Falhas, validação e Git

Para falha de redação/revisão, salve uma explicação sem segredos em `.local/resultados/ID-erro.txt` e use `worker.mjs fail ID arquivo`. O card fica vermelho e oferece nova tentativa. Preserve resultados obsoletos para conciliação, sem sobrescrever trabalho humano.

Falha SFTP/HTTP mantém a publicação retomável. Credencial indisponível, arquivo remoto divergente ou conflito real exigem interromper aquela publicação. Informe apenas bloqueios acionáveis e não repita alertas idênticos em toda rodada.

Quando mudar código, rode check-editorial.cjs, check-workflow.mjs e verificações de sintaxe. Após publicar, rode os validadores do site e confira desktop/mobile e links de retorno da página publicada.

Faça commit/push restrito após entregas ou publicações, verificando o commit remoto. No painel: studio, editorial, conteudos, scripts, referencias e documentos do projeto. No site: somente saídas do plano, ledger, miniaturas, manifesto e documentação envolvida. Não incluir .local, backups, segredos ou mudanças de outras tarefas. Se push falhar, preserve o commit e reporte; não republique o post já confirmado.

Reporte novas entregas e URLs publicadas, ou bloqueios que exigem ação. Sem trabalho ou mudança significativa, permaneça em silêncio. Não enviar mensagens a terceiros. A execução é local: computador ligado, internet e Codex aberto; não é um serviço em nuvem.
