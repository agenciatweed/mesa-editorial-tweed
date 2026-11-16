# Artigos do blog no LinkedIn

Autorização de Felipe, 16/11/2026: publicar imediatamente o acervo posterior a **Marca não se faz no Canva. Se faz no cotidiano.** até o último artigo publicado no blog; depois, repetir a etapa para cada nova publicação confirmada no site. Publicar como **Agência Tweed**, Company Page 35563028, em formato **artigo completo**. Não limitar esta fila às duas vagas diárias do blog. A cadência e a aprovação humana do blog continuam iguais.

Usar título e texto integral do artigo público, com parágrafos, subtítulos, ênfases e links do corpo, além da mesma capa. Não copiar navegação, sumário técnico, rodapé do site ou FAQ estruturado. A legenda contém o título entre aspas e, abaixo, `Artigo originalmente publicado no blog da Agência Tweed:` e o URL canônico. **Agência Tweed fica em texto simples, sem @menção**, conforme autorização para dispensar essa etapa. Não inventar resumos, hashtags, fatos ou novas imagens.

## Fila e retomada

`node scripts/linkedin.mjs sync` descobre artigos nos catálogos publicados do site. `status` ou `next` informa totais e o primeiro pendente. O registro fica em `.local/linkedin/estado.json`, sob o mesmo lock de gravação da Mesa. Não altera pautas, aprovação, datas do blog ou jobs existentes. O wrapper de publicação chama sync após sucesso real; se falhar, a próxima rodada reconcilia sem republicar o blog.

1. Antes de criar um novo artigo, execute `node scripts/linkedin.mjs start SLUG`. A saída informa o payload local e eventual `draftUrl`. Abra o rascunho existente; não crie outro. Com `state:publishing`, primeiro confira as publicações reais da empresa: um erro de conexão não comprova falha no envio.
2. No Chrome conectado, abra a aba administrativa ou editor indicado na configuração. Verifique a identidade Agência Tweed. Preencha primeiro o título; espere a URL mudar de `/article/new/` para `/article/edit/` e o indicador confirmar o salvamento. Registre `node scripts/linkedin.mjs draft SLUG URL_DO_EDITOR` imediatamente.
3. Envie a capa pelo seletor de arquivo suportado. Confira sua prévia, aplique e espere o salvamento. Cole o HTML do corpo preservando formatação. Compare o texto integral do editor com bodyText do payload, ignorando apenas espaços. Verifique que título e capa não desapareceram após a recriação automática do editor. Nunca publicar texto vazio ou truncado.
4. Avance e preencha a legenda inteira de uma vez. setValue pelo índice da árvore de acessibilidade funcionou; digitar trechos separados reposicionou o cursor e causou inversões. Não tentar @menções. Leia e confira a legenda antes do envio.
5. Execute `node scripts/linkedin.mjs publishing SLUG` antes de clicar em Publicar. Publique e confira a confirmação real do LinkedIn, o título e a URL `/pulse/`. Abra “Visualizar publicação” e confira a legenda, capa e link do blog. Salve screenshot como prova. Sem confirmação, mantenha o estado incerto para conciliar na retomada.
6. Salve um JSON local de evidência com `slug`, `blogUrl`, `articleUrl`, `postUrl`, `bodySha256`, `coverSha256` e `confirmedAt` (ISO real). Execute `node scripts/linkedin.mjs confirm SLUG ARQUIVO.json`. O helper registra os URLs públicos e impede nova publicação do mesmo slug. Não invente evidências e não confirme apenas porque clicou no botão.

`payload SLUG` atualiza o arquivo local sem iniciar envio. `blocked SLUG MOTIVO` guarda um bloqueio sem apagar o rascunho nem presumir o resultado de um envio incerto. `import-confirmations ARQUIVO.json` importa uma lista de publicações já verificadas, com os mesmos campos de evidência. Os registros são privados e ficam fora do Git. Código e documentação podem ser versionados.

## Execução recorrente

Depois do blog e antes de encerrar qualquer rodada, rode sync/next e processe a fila LinkedIn em ordem cronológica, incluindo o acervo pendente mesmo quando não houver publicação nova no blog. Novos artigos entram após os anteriores. Publique imediatamente no ritmo natural da operação, sem agendamento artificial. Confira o registro em cada retomada e não duplique envios. A publicação no LinkedIn depende do computador ligado, aplicativo em execução e Chrome autenticado e acessível por ferramenta de navegador. A aba aberta sozinha não garante conexão.

Se a extensão desaparecer ou o canal cair, preserve estado e tente a recuperação documentada, sem reiniciar o rascunho. Não contornar avisos, desafios ou autenticação. Uma falha LinkedIn não desfaz a publicação no blog e não impede os demais trabalhos da Mesa. Informe apenas bloqueios acionáveis, evitando alertas repetidos idênticos.

Se a execução for interrompida por limite de uso, retome do registro quando o aplicativo permitir outra execução. A tarefa de seis horas também consulta a fila. O agente não consegue garantir despertar no instante exato de renovação de créditos; nunca tratar uma execução encerrada como processo ainda ativo.
