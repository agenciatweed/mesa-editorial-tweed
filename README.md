# Estúdio Editorial Tweed

Painel local privado para pautas, redação, revisão, capa e publicação no blog estático.

## Abrir

Dê dois cliques em **H:\TweedMD\TweedEditorial\Abrir-Estudio.cmd**.
O arquivo inicia um servidor local e abre **http://127.0.0.1:4173** no navegador.
Não abra `studio/index.html` diretamente para trabalhar: a gravação e a fila precisam do servidor.
Node.js 18+ e Python com Pillow são necessários. Não há framework nem build de frontend.
Para ver o servidor no terminal: `node scripts/serve.mjs`. Fechar a aba não encerra o servidor.

## Fluxo de trabalho

1. **Pauta:** preencha somente título, editoria, voz principal, ângulo e tese, quem precisa ler e mudança de percepção. Clique em **Salvar pauta**. A luz fica vermelha enquanto aguarda a tarefa horária.
2. **Redação:** o GPT escreve o artigo e o prompt de capa para Midjourney, e devolve o post nesta coluna com luz verde. Se um post em Redação tiver texto mas estiver sem prompt, a tarefa também cria apenas o prompt na próxima rodada, inclusive para rascunhos antigos, sem reescrever o artigo. Edite o texto e clique em **Salvar redação e enviar para revisão**.
3. **Revisão:** a luz fica vermelha até o GPT conferir o texto e preencher frase-chave de foco, slug e metadescrição. Ele também prepara o FAQ exclusivamente como metadado. Quando a luz ficar verde, confira os dados, envie a capa e preencha a descrição da imagem. Clique em **Salvar revisão e aprovar publicação**. Se mudar o texto ou o briefing após a revisão, a luz volta a vermelho e os metadados precisam ser conferidos novamente.
4. **Pronto:** o post está aprovado e aguarda a próxima rodada de publicação. A data é opcional na revisão; se ficar vazia, a aprovação utiliza o dia atual. Uma data futura adia o envio. **Voltar para revisão** cancela o envio pendente para permitir ajustes.
5. **Artigos:** depois que SFTP e HTTP confirmarem a publicação, o post sai das quatro colunas e aparece somente nesta aba, com texto, metadados, capa, data e link do site preservados. O histórico publicado é somente leitura.

O rascunho é salvo automaticamente durante a edição, mas **o botão Salvar conclui cada etapa**. Uma pauta nova só entra na fila ao clicar em Salvar pauta. As seis pautas do pacote original continuam preservadas: abra e salve a etapa para incluí-las no fluxo novo.

Luz vermelha: automação pendente ou falha. Luz verde: trabalho automático concluído nesta etapa. Os indicadores também têm texto, para que a cor não seja a única informação. Falhas podem ser reenviadas com **Tentar automação novamente**.

Autor e logo são fixos e não ocupam campos no formulário. O FAQ fica apenas no JSON-LD (`BlogPosting.hasPart`), sem seção no Markdown ou no HTML visível e sem marcação `FAQPage` ou promessa de rich results.

Capa: PNG, JPEG ou WebP até 12 MB, mínimo 600 × 400 px. O upload fica disponível quando a revisão automática estiver concluída. As dimensões reais são preservadas.

## GPT e agendamento

A criação de conteúdo acontece pelo GPT da tarefa agendada do Codex, usando os arquivos locais e pesquisa de fontes. Não há chave OpenAI no painel nem cobrança de API configurada. Salvar a etapa registra o trabalho correspondente; o retorno do GPT ocorre na rodada horária. Mantenha o computador ligado, conectado e o aplicativo Codex aberto. O navegador e o servidor do painel podem estar fechados durante o processamento.

A especificação da tarefa está em `editorial/AUTOMACAO.md`. Ela processa a fila a cada hora e usa `scripts/worker.mjs` para assumir e concluir pedidos com verificação de versão. Não existe webhook ou GitHub Actions executando este painel na nuvem. O GitHub guarda o histórico; o computador local executa o trabalho.

## Arquivos e Git

- `editorial/pautas.json`: fonte principal dos dados do painel.
- `editorial/fila.json`: solicitações explícitas e seus estados.
- `conteudos/<id>/`: Markdown, briefing, metadados e capas enviadas.
- `editorial/integracao.json`: caminho relativo do projeto do site (`..` nesta instalação).
- `scripts/publicar.py`: entrada para o publicador mantido em `../tools/publicar_editorial.py`.
- `backups/` e `.local/`: recuperação e registros privados, ignorados pelo Git.

O servidor salva os arquivos automaticamente, usando revisão otimista e bloqueio de gravação. Uma mudança externa não pode ser sobrescrita por uma aba antiga. Alterações externas no Markdown exigem conciliação com `pautas.json`. A cópia antiga do navegador é preservada antes de carregar o projeto do disco. Em caso de conflito, exporte seu backup antes de recarregar.

O repositório deste painel é **agenciatweed/mesa-editorial-tweed**. Ele é separado do repositório **agenciatweed/novo-site-tweed**, que contém HTML público e o gerador. A automação faz commit e push dos arquivos envolvidos após cada entrega ou publicação. `scripts/sincronizar.ps1` permite envio manual com o Git já autenticado. Nunca usar force push nem incluir backups/credenciais.

## Publicação e credenciais

O site é HTML estático em Kinghost, sem WordPress. O publicador gera em diretório temporário, valida o resultado e envia uma lista explícita por SFTP. Antes de sobrescrever, compara o arquivo remoto com a versão local e guarda backup. Valida hashes por SFTP e HTTP antes de marcar publicado. Publicações interrompidas têm registro local para retomada.

A senha fica no **Gerenciador de Credenciais do Windows**, alvo `TweedEditorial/Kinghost`, vinculada ao usuário Windows. Não fica em arquivo, URL, Git ou navegador. Para cadastrá-la em outra instalação: `python scripts/credencial_sftp.py configurar`. Para verificar apenas disponibilidade: `python scripts/credencial_sftp.py verificar`.
As bibliotecas de manutenção Markdown e Paramiko ficam em `../.local/editorial-runtime`; instalar em outra máquina com `python -m pip install --target ../.local/editorial-runtime Markdown paramiko`. BeautifulSoup, Pillow e requests também são necessários para as ferramentas locais do site. Nenhuma dessas dependências vai ao FTP.

## Verificar

`node scripts/check-editorial.cjs` e `node scripts/check-workflow.mjs` verificam lógica e integração em dados temporários. Os arquivos JS/MJS podem ser conferidos com `node --check`. Publicação de teste deve usar `python scripts/publicar.py --job ID --dry-run`, que não modifica o site nem conecta ao FTP.

O endereço hospedado anteriormente no ChatGPT Sites é uma cópia independente e não recebe este fluxo local.
