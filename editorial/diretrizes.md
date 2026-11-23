# Direção editorial da Tweed

Marcas crescem por clareza, consistência e confiança. A Tweed integra estratégia e execução para resolver a comunicação com direção.

## Equilíbrio das editorias — 23/11/2026

Antes de pesquisar cada pauta automática, use a contagem retornada por daily-pauta.mjs check. O helper lê os dois catálogos completos de publicações, deduplica por slug e conta os artigos das seis editorias; pautas e textos ainda não publicados aparecem separadamente como estoque, sem inflar a contagem de publicações.

Pesquise uma oportunidade pertinente à selectedEdition, a editoria com MENOS artigos publicados no momento. Entre editorias empatadas nessa contagem, escolha a que está há mais tempo sem receber pauta nova. Essa regra também mantém a rotação quando as quantidades se aproximam. Use a data de criação da pauta, nunca a data agendada de publicação nem a última edição do texto. O ledger diário recupera as datas existentes; pautas manuais novas também recebem createdAt. Editorias sem registro de pauta têm prioridade no desempate e o índice estável resolve um empate completo.

Não mudar editorias de textos existentes nem forçar um assunto que não corresponda à série. Se não houver oportunidade relevante e verificável para a editoria selecionada, não fabricar pauta. Recontar em cada execução. O add revalida a seleção sob lock; reason:editoria-changed pede nova consulta e pesquisa adequada, sem criar uma segunda sugestão. As criações manuais permanecem livres.

## Voz
Português brasileiro natural. Exigência no padrão, repertório na substância e generosidade na entrega. Ensinar o porquê com exemplos concretos. Sem travessões na redação, emojis, jargão ornamental, superlativos ou promessa de resultado. O leitor nunca é o vilão.

## Variedade na criação dos títulos

Ao formular novas pautas ou títulos ainda não definidos, varie a construção: afirmações provocativas, frases diretas, contrastes, observações concretas, convites à ação e perguntas quando contribuírem para a tese. Perguntas não são o formato padrão nem devem dominar a sequência.

Compare os cinco títulos publicados mais recentes, os das pautas pendentes e os já criados na rodada. Quando perguntas predominarem nesse conjunto, escolha uma construção não interrogativa para a próxima sugestão. Varie também os inícios, a sintaxe e o ritmo; não substitua uma fórmula repetida por outra nem apenas retire o ponto de interrogação. O título deve dizer algo específico que o artigo sustenta, sem sensacionalismo, suspense vazio ou promessa de resultado.

A regra vale para novas criações. Preserve os títulos já fornecidos ou salvos nas pautas e os de textos aprovados ou publicados, salvo pedido explícito de alteração.

## Evidência e privacidade
Verificar fontes primárias para dados, estudos, cases e citações. Distinguir fato, interpretação e recomendação. Antes de pautar ou redigir, compare os cinco textos mais recentes e os desta rodada. Varie o setor, o porte e a construção do argumento conforme a decisão do leitor. Considere clínicas e consultórios médicos ou odontológicos, profissionais liberais, advocacia, contabilidade, auditoria, restaurantes, bares, lojas de vinhos e delicatessens. Uma pergunta de cliente, um gesto durante o atendimento, duas escolhas de cardápio ou uma análise direta podem sustentar o texto. O exemplo pode entrar no meio ou ser dispensado. Evite repetir “Imagine uma pequena loja” e rotular exemplos anônimos como hipotéticos, inclusive nas notas. Reserve atribuições e resultados reais a casos documentados. Arquétipos são ferramentas interpretativas. Não incluir dados comerciais, diagnósticos internos ou histórias identificáveis de clientes sem autorização.

## Identidade
Teal Tweed #08ffb1; azul-escuro #0b0c13; branco #ffffff. Tipografia Inter. Logo oficial. Fonte: https://github.com/agenciatweed/brand-guidelines-tweed (commit ac2f5c11089641941a4a20bb91a718375b362910).

## Publicação
Artigo, frase-chave na abertura, metadescrição, fontes, FAQ exclusivamente no JSON-LD, sem seção visível no artigo e prompt em inglês com apenas --ar 3:2. Dados estruturados dependem de metadados reais e revisão editorial. Publicar no blog é uma etapa separada.


## Fontes clicáveis — 23/10/2026

Usar uma referência por linha com nome descritivo em Markdown [Nome da fonte, título ou data](https://endereco-da-fonte). Separar notas explicativas por parágrafos. O publicador mantém suporte ao formato legado Nome: URL, exibindo o nome como link; campo vazio não gera seção.


## Direção das capas

Escolha algo que o artigo permita fotografar literalmente. Num texto sobre o agendamento de consultas, mostre o momento de marcar o retorno na recepção. Num texto sobre a escolha de vinhos, mostre o detalhe da prateleira que ajuda a decidir. Identifique no briefing a ação, o objeto ou o espaço que comunica a questão central. A presença de pessoas depende da cena.

Consulte os cinco prompts recentes e os já feitos na rodada para variar setor, gesto, ambiente e enquadramento. Use um acento teal inspirado em #08ffb1 na iluminação, numa peça de roupa, num objeto ou no ambiente. Preserve a luz principal suave e os tons de pele naturais. Dispense metáforas abstratas como padrão.

Escreva o prompt em inglês, sem texto ou logos legíveis, terminando apenas em --ar 3:2. Inclua imageAlt breve em português descrevendo a cena. Preserve prompts, capas e descrições manuais existentes.
