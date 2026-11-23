# Estúdio Editorial Tweed

Painel local privado para pautas, redação, revisão, capa e publicação no blog estático.

## Abrir

Dê dois cliques em **H:\TweedMD\TweedEditorial\Abrir-Estudio.cmd**.
O arquivo inicia um servidor local e abre **http://127.0.0.1:4173** no navegador.
Não abra `studio/index.html` diretamente para trabalhar: a gravação e a fila precisam do servidor.
Node.js 18+ e Python com Pillow são necessários. Não há framework nem build de frontend.
Para ver o servidor no terminal: `node scripts/serve.mjs`. Fechar a aba não encerra o servidor.

## Fluxo de trabalho

1. **Pauta:** preencha somente título, editoria, voz principal, ângulo e tese, quem precisa ler e mudança de percepção. Clique em **Salvar pauta**. A luz fica vermelha enquanto aguarda a tarefa a cada 24 horas.
2. **Redação:** o GPT escreve o artigo e o prompt de capa para Midjourney, e devolve o post nesta coluna com luz verde. Se um post em Redação tiver texto mas estiver sem prompt, a tarefa também cria apenas o prompt na próxima rodada, inclusive para rascunhos antigos, sem reescrever o artigo. Edite o texto e clique em **Salvar redação e enviar para revisão**.
3. **Revisão:** a luz fica vermelha até o GPT conferir o texto e preencher frase-chave de foco, slug e metadescrição. Ele também prepara o FAQ exclusivamente como metadado. Você pode enviar a capa e preencher a descrição assim que entrar nesta etapa. Quando a luz ficar verde, confira os dados. Use **Salvar e manter em revisão** para guardar a capa, a descrição e suas edições enquanto aguarda o GPT. Somente **Aprovar e enviar para Pronto** autoriza a publicação. Se mudar o texto ou o briefing após a revisão, a luz volta a vermelho e os metadados precisam ser conferidos novamente.
4. **Pronto:** o post está aprovado e aguarda a rodada diária, com no máximo um artigo publicado por dia de São Paulo, inclusive em rodadas extras. Ao entrar em Revisão, a data é preenchida com o primeiro dia sem artigo reservado a partir de amanhã (America/Sao_Paulo), considerando os itens em Revisão e Pronto. Datas já preenchidas são preservadas e você pode alterar a sugestão manualmente, inclusive para um dia já ocupado. Se apagar a data, a aprovação calcula novamente o primeiro dia futuro com vaga. Uma data futura adia o envio. **Voltar para revisão** cancela o envio pendente para permitir ajustes.
5. **Artigos:** depois que SFTP e HTTP confirmarem a publicação, o post sai das quatro colunas e aparece somente nesta aba, com texto, metadados, capa, data e link do site preservados. O histórico publicado é somente leitura.

O rascunho é salvo automaticamente durante a edição. Em Revisão, **Salvar e manter em revisão** confirma a gravação sem avançar; **Aprovar e enviar para Pronto** conclui a etapa. Uma pauta nova só entra na fila ao clicar em Salvar pauta. As seis pautas do pacote original continuam preservadas: abra e salve a etapa para incluí-las no fluxo novo.

Luz vermelha: automação pendente ou falha. Luz verde: trabalho automático concluído nesta etapa. Os indicadores também têm texto, para que a cor não seja a única informação. Falhas podem ser reenviadas com **Tentar automação novamente**.

Autor e logo são fixos e não ocupam campos no formulário. O FAQ fica apenas no JSON-LD (`BlogPosting.hasPart`), sem seção no Markdown ou no HTML visível e sem marcação `FAQPage` ou promessa de rich results.

Capa: PNG, JPEG ou WebP até 12 MB, mínimo 600 × 400 px. O upload fica disponível imediatamente ao entrar em Revisão, mesmo antes da rodada automática. A aprovação para Pronto continua exigindo a revisão concluída. As dimensões reais são preservadas.

## GPT e agendamento

A criação de conteúdo acontece pelo GPT da tarefa agendada do Codex, usando os arquivos locais e pesquisa de fontes. Não há chave OpenAI no painel nem cobrança de API configurada. Salvar a etapa registra o trabalho correspondente; o retorno do GPT ocorre na rodada a cada 24 horas. Mantenha o computador ligado, conectado e o aplicativo Codex aberto. O navegador e o servidor do painel podem estar fechados durante o processamento.

A especificação da tarefa está em `editorial/AUTOMACAO.md`. Ela processa a fila a cada 24 horas e usa `scripts/worker.mjs` para assumir e concluir pedidos com verificação de versão. Não existe webhook ou GitHub Actions executando este painel na nuvem. O GitHub guarda o histórico; o computador local executa o trabalho.

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

O site é HTML estático em Kinghost, sem WordPress. O publicador gera em diretório temporário, valida o resultado e envia uma lista explícita por FTP. Antes de sobrescrever, compara o arquivo remoto com a versão local e guarda backup. Valida hashes por FTP e HTTP antes de marcar publicado. Publicações interrompidas têm registro local para retomada.

A senha fica no **Gerenciador de Credenciais do Windows**, alvo `TweedEditorial/Kinghost`, vinculada ao usuário Windows. Não fica em arquivo, URL, Git ou navegador. Para cadastrá-la em outra instalação: `python scripts/credencial_sftp.py configurar`. Para verificar apenas disponibilidade: `python scripts/credencial_sftp.py verificar`.
As bibliotecas de manutenção Markdown e Paramiko ficam em `../.local/editorial-runtime`; instalar em outra máquina com `python -m pip install --target ../.local/editorial-runtime Markdown paramiko`. BeautifulSoup, Pillow e requests também são necessários para as ferramentas locais do site. Nenhuma dessas dependências vai ao FTP.

## Verificar

`node scripts/check-editorial.cjs` e `node scripts/check-workflow.mjs` verificam lógica e integração em dados temporários. Os arquivos JS/MJS podem ser conferidos com `node --check`. Publicação de teste deve usar `python scripts/publicar.py --job ID --links PLANO-LINKS.json --related PLANO-RELACIONADOS.json --dry-run`, que não modifica o site nem conecta ao FTP.

O endereço hospedado anteriormente no ChatGPT Sites é uma cópia independente e não recebe este fluxo local.

## Links e recomendações

Cada publicação prepara links naturais do artigo novo para antigos e suas duas recomendações de leitura. A análise ampla para alterar links e recomendações dos artigos antigos acontece apenas a cada 10 execuções da tarefa, contadas em arquivo privado persistente, incluindo rodadas sem fila. O limite continua sendo quatro links para outros artigos no corpo; as duas recomendações finais não entram nesse limite. As regras e o contador estão em editorial/AUTOMACAO.md.

Fontes e notas é opcional: vazio ou só com espaços não cria seção na página nem bloqueia a publicação. As informações factuais utilizadas continuam exigindo evidência apropriada.


Acesso vigente desde 18/10/2026: FTP normal, porta 21, modo passivo, raiz remota `/www/`, configurado por `transport: "ftp"` em `editorial/integracao.json`. A credencial continua no cofre TweedEditorial/Kinghost; o nome histórico do helper credencial_sftp.py foi preservado. Não usar a raiz absoluta do SFTP no FTP. Não espelhar diretórios nem excluir arquivos para substituir: enviar temporário, verificar hash, renomear e confirmar FTP/HTTP antes de arquivar.


## Reposição e fontes — 23/10/2026

Além da sugestão diária com menos de 10 cards em Pautas, a automação cria uma reposição se a coluna estiver vazia, mesmo após a diária. Máximo uma por execução, sem restringir criação manual; exige pesquisa verificável. As fontes publicadas exibem nomes clicáveis e notas separadas.


## Variedade das capas — 26/10/2026

As capas mostram situações, espaços ou objetos tratados no artigo, com um detalhe teal na cena. A direção completa está em editorial/diretrizes.md.


## Inicializacao sem janela — 18/11/2026

A tarefa local Tweed - Estudio Editorial executa scripts/iniciar-servidor.pyw com pythonw.exe. O Node usa CREATE_NO_WINDOW, arquivos privados de log e trava de instancia unica; o Agendador preserva o usuario, gatilho de logon e reinicio em falha existentes. scripts/iniciar-servidor.ps1 fica como entrada manual de compatibilidade e tambem inicia pythonw sem console. Abrir-Estudio.cmd usa essa mesma entrada. Interface e API em http://127.0.0.1:4173/ conferidas com o servidor ativo entre chamadas, sem janela de PowerShell ou Terminal.

## Recuperacao da conexao — 19/11/2026

O launcher sem console supervisiona o Node e reinicia o servidor quando ele encerra, com intervalo progressivo de 2 a 30 segundos. A tarefa do Windows permanece ativa; iniciar uma segunda instancia continua bloqueado. Para interromper permanentemente, pare a tarefa e seus processos.

O painel tenta novamente a conexao inicial e renova a sessao apos reinicios. Rascunhos e revisoes otimistas sao preservados. Um envio sem resposta nunca e repetido automaticamente; somente um POST explicitamente recusado com 403 pode ser tentado uma vez com a sessao renovada. `node scripts/check-connection.cjs` verifica reconexao, sessao, rascunhos e ausencia de reenvio incerto.

Verificacao local: encerramento controlado do Node seguido de reinicio automatico pela tarefa, API HTTP 200, hashes de pautas/fila inalterados e painel reconectado no navegador. Nenhuma janela de console foi aberta.


## Equilibrio das editorias — 23/11/2026

As sugestoes automaticas priorizam a editoria com menos artigos publicados. Nos empates, tem prioridade a que recebeu pauta nova ha mais tempo. O helper reconta e revalida sob lock; criacoes manuais permanecem livres.
