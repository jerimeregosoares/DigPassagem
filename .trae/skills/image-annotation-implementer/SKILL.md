---
name: image-annotation-implementer
description: Analisa imagens com marcações vermelhas para identificar e aplicar mudanças de UI e lógica. Invoque quando o usuário fornecer imagens com setas ou textos indicando modificações.
---

# Image Annotation Implementer

Esta skill permite que o assistente analise detalhadamente imagens fornecidas pelo usuário que contenham anotações manuais (geralmente em vermelho), setas e textos explicativos sobre mudanças desejadas no sistema.

## Quando usar

**Invoque esta skill IMEDIATAMENTE quando:**
- O usuário enviar uma captura de tela com desenhos, setas ou textos em vermelho.
- O usuário pedir para "aplicar os ajustes da imagem" ou "implementar o que está marcado".
- Houver instruções visuais que complementam ou substituem descrições textuais.

## Estrutura de Trabalho

Ao receber uma imagem anotada, siga estes passos:

1. **Análise Visual Detalhada (OCR + Contexto):**
   - Identifique a área exata da tela onde a marcação aponta.
   - Extraia o texto contido nas caixas de comentário.
   - Classifique a mudança: **Adição** (novo elemento), **Remoção** (deletar algo), **Substituição** (trocar A por B) ou **Correção** (ajustar comportamento).

2. **Definição de Requisitos:**
   - **UI:** Quais componentes precisam ser criados ou alterados? (Cores, estados, posições).
   - **Lógica:** Quais regras de negócio estão implícitas? (Cálculos, condições, validações).
   - **Dados:** Onde essa informação será salva? (API, Banco de Dados, Estado local).

3. **Execução Técnica:**
   - Localize o arquivo de código correspondente à tela da imagem.
   - Implemente as mudanças mantendo a consistência visual do projeto original.
   - Garanta que todos os pontos marcados foram atendidos.

4. **Revisão de Conformidade:**
   - Compare o código final com a imagem original.
   - Verifique se cores, rótulos e comportamentos batem 100% com o que foi solicitado visualmente.

## Exemplo de Aplicação

**Entrada:** Imagem apontando para um seletor de data com o texto "Adicione botões Ida e Volta aqui".

**Ação:**
- Identificar o componente de data no código.
- Inserir os botões logo abaixo.
- Atualizar a lógica de preço (multiplicar por 2 se ambos ativos).
- Atualizar a chamada da API para enviar os novos campos.