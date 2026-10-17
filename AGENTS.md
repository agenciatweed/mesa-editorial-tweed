# Projeto Agência Tweed: estúdio editorial

Leia `LEIA-ME-CODEX.md`, `README.md`, `editorial/diretrizes.md`, `editorial/especialistas.md` e `editorial/editorias.json` antes de modificar o projeto.

## Instruções do proprietário

- Felipe autorizou usar o Git já instalado em seu computador e o repositório `https://github.com/agenciatweed/mesa-editorial-tweed.git` para armazenar este projeto.
- Diretório de trabalho pretendido: `H:\TweedEditorial`.
- Ele recusou o plugin GitHub nesta conversa. Não solicitá-lo novamente nem pedir mudanças em autenticação ou habilitação de 2FA. Reutilizar o acesso Git que já funciona no Codex local.
- Preservar todos os arquivos e alterações existentes. Nada de force push, reset destrutivo ou exclusão de conteúdo para facilitar o setup.
- Não colocar segredos em código, URL, arquivos ou instruções de terminal.
- Arquivos internos de clientes e diagnósticos pessoais não fazem parte deste pacote. Não buscar nem publicar esses documentos como conteúdo.

## Identidade

Usar o logo oficial de `studio/assets/`, Inter local, teal #08ffb1, azul-escuro #0b0c13 e branco. Os tamanhos nos nomes dos arquivos TTF são os estilos da família, não os tamanhos CSS obrigatórios.

## Dados

Os IDs numéricos de editoria são estáveis para manter compatibilidade com a primeira versão:
0 Pequeno, mas Estratégico; 1 Marcas que Ficam; 2 Branding na Marra; 3 Marcas em Ação; 4 Marcas em Movimento; 5 Marcas com Alma.
A ordem visual oficial é [0, 5, 1, 2, 3, 4]. Não renumerar as pautas ao reordenar os cartões.

`editorial/pautas.json` é o arquivo de projeto; `conteudos/<id>/` contém os arquivos gerados. Alterações diretas em Markdown não são importadas automaticamente ao índice: reconciliar ambos antes de usar o autosave do navegador para não perder edições. As versões recentes de arquivos são prioritárias em relação às sementes de `studio/app.js`.

O armazenamento local do navegador guarda uma cópia. O acesso à pasta exige seleção do usuário. Uma cópia antiga de `pautas.json` não deve sobrescrever trabalho mais recente. Conflitos externos pausam a gravação. Backups ficam fora do Git por padrão.

## Desenvolvimento e verificação

Interface sem build e sem dependências de execução. Node 18+ para `scripts/serve.mjs`. Não instalar framework sem necessidade.

Verificar sintaxe de `studio/app.js`, `studio/storage.js` e `scripts/serve.mjs`; rodar testes de lógica em `scripts/check-editorial.cjs`. A verificação em navegador e o acesso à pasta devem ocorrer no computador local. Verificar save, reload, edição preservada e Git push antes de afirmar que a persistência completa funciona.

O script de sincronização prepara os diretórios conhecidos e faz commit/push com o Git local. Se surgir autenticação, usar o mecanismo já configurado pelo usuário. Nunca inventar confirmação de envio.

## Integração local atual (17/10/2026)

A pasta real é `H:\TweedMD\TweedEditorial`, preservada no local escolhido por Felipe. Este repositório é próprio e fica ignorado pelo Git do site pai. O README atual substitui as instruções antigas de seleção manual de pasta para uso pelo servidor local.
Leia também `editorial/AUTOMACAO.md` antes de processar pedidos. O GPT roda na tarefa horária do Codex, sem API embutida ou chave no navegador. O painel registra ações explícitas em fila.json; não processe sementes apenas por estarem em Pauta/Redação.
Felipe autorizou commit/push do painel e, após aprovação Pronto, publicação no SFTP e commit/push dos arquivos envolvidos no site. Nenhuma outra página institucional nem pasta de cliente entra nessa autorização.
A única credencial persistida está no cofre do Windows, não nos arquivos do projeto. O publicador deve exigir o hash do texto e capa aprovados e validar todas as saídas antes de marcar publicado.

## Fluxo atual por etapas (substitui o fluxo de solicitações anterior)

Salvar Pauta agenda redação; o GPT entrega corpo, fontes e prompt em Redação. Salvar Redação envia para Revisão; o GPT prepara keyword, slug, meta e FAQ e permanece em Revisão com luz verde. Salvar Revisão com capa e descrição aprova Pronto e autoriza publicação. Depois da confirmação, publication.state=published tira o item da mesa e o mantém em Artigos. Não apagar o item ou os arquivos ao arquivar.
O FAQ é exclusivamente JSON-LD, nunca visível no artigo ou no Markdown. Autor e logo são fixos. O botão de aprovação da revisão registra os critérios humanos sem exigir os quatro checkboxes antigos. A tarefa usa worker.mjs sync para reconciliar etapas submetidas; não submeter sementes antigas automaticamente.
