# Transferência para o Codex local

## Objetivo

Assumir o Estúdio Editorial Tweed em `H:\TweedEditorial`, usando o Git local já autenticado para sincronizar com `https://github.com/agenciatweed/mesa-editorial-tweed.git`. Felipe escolheu esse caminho em vez de instalar o plugin GitHub ou alterar sua autenticação.

## O que já foi feito

1. Portal editorial funcional com pauta, redação, revisão, aprovação e exportação Markdown/JSON-LD.
2. Identidade aplicada a partir do repositório oficial: teal #08ffb1, azul-escuro #0b0c13, branco, Inter local e logo SVG oficial.
3. Seis editorias com os nomes e as descrições exatos fornecidos por Felipe. Ordem visual e IDs documentados em AGENTS.md.
4. Lorenzo é a voz principal em Pequeno, mas Estratégico; Marcas que Ficam; Branding na Marra; Marcas em Ação; Marcas em Movimento. Mauro conduz Marcas com Alma. O segundo olhar complementa as demais séries. Razões completas estão em editorias.json.
5. Briefings incorporam a descrição da editoria e o papel de cada especialista. Novas pautas já recebem a voz principal correspondente. Migração preserva os índices da versão original.
6. Gravação explícita em pasta, autosave, cópia no navegador, backup antes de abrir outro projeto e pausa diante de conflito externo. JSON principal, Markdown, briefings e metadados legíveis.
7. Seis pautas e um primeiro rascunho: “O custo invisível de coordenar o próprio marketing”. Não está aprovado para publicação.

## O que fazer agora

1. Ler AGENTS.md e este arquivo. Inspecionar a pasta e o Git existente antes de qualquer alteração.
2. Se os arquivos ainda estão em ZIP, extraí-los sem sobrescrever arquivos mais recentes. Se há uma cópia Git, preservá-la. Se ainda não existe .git, conferir o remoto e seu conteúdo antes de inicializar/apontar origin. Não clonar por cima de uma pasta ocupada.
3. Usar o acesso Git que já funciona neste computador. O envio ao repositório foi autorizado por Felipe. Verificar a branch remota e qualquer commit preexistente; integrar sem perder conteúdo.
4. Executar `node scripts/check-editorial.cjs` e verificar a sintaxe dos três arquivos JS/MJS. Iniciar `node scripts/serve.mjs` e fazer QA visual no Chrome/Edge, desktop e tela estreita.
5. No portal, ir a Arquivos e Git e orientar Felipe a selecionar `H:\TweedEditorial`. O navegador exige essa ação do usuário. Não fingir acesso ao disco sem a seleção.
6. Se Felipe editou o portal original, primeiro exportar seu backup JSON e preservar o projeto atual. Fazer uma importação/reconciliação sem perder pautas. A cópia do pacote é a semente inicial, não um snapshot do navegador dele.
7. Verificar que título, texto, voz editorial e metadados continuam corretos depois de salvar, fechar e reabrir a pasta. Validar também o bloqueio de conflito externo.
8. Revisar `git status` e a lista de arquivos a enviar. Fazer commit e push de código, diretrizes e conteúdo editorial. Confirmar o commit no remoto antes de dizer que está no GitHub.

## Melhorias possíveis depois da transferência

- Um fluxo local que trate os arquivos como fonte principal ao abrir o estúdio, com reconciliação segura entre JSON e Markdown, evitando a necessidade de edição duplicada.
- Integração local ao Git instalada somente se fizer sentido; o fluxo atual já permite usar cliente Git ou o script de envio.
- Um editor de texto mais confortável e publicação no blog somente quando solicitada.

## Fronteiras

Este pacote não inclui diagnósticos privados, dados financeiros, lista de contratos nem histórico de conflitos de clientes. O contexto público e os critérios editoriais relevantes foram preservados.

Os perfis Lorenzo e Mauro são orientações editoriais, sem API embutida. Não estão incluídos livros, embeddings ou endpoints desses plugins. Evitar citações que dependam de fontes não acessadas.

O site privado hospedado pelo ChatGPT e o GitHub são destinos diferentes. Esta transferência não cria deploy automático do GitHub para aquele endereço. Prefira a cópia local para a próxima etapa; defina publicação externa só quando solicitada.

## Estado de verificação na origem

Sintaxe e fluxos lógicos testados: editorias, persistência, migração, aprovação, exportação, arquivos simulados e conflitos. Revisão visual e acesso real ao H: ainda dependem do ambiente local. Nenhum commit foi enviado deste ambiente para o GitHub do usuário.

## Atualização local de 17/10/2026

O pacote foi integrado em H:\TweedMD\TweedEditorial. Use o README atual e editorial/AUTOMACAO.md para o fluxo com servidor, fila GPT e publicação no site estático. O handoff acima registra o estado de origem e não descreve mais todas as funcionalidades atuais.
