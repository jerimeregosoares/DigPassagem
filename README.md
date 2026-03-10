# DigRifa - Sistema de Gestão de Rifas e Campanhas

Bem-vindo ao repositório do **DigRifa**, uma aplicação completa para gerenciamento de rifas, campanhas e sorteios.

## 🚀 Funcionalidades Principais

- **Gestão de Campanhas:** Crie, edite e gerencie campanhas de rifas.
- **Sorteios:** Realize sorteios manuais ou automáticos.
- **Ranking:** Acompanhe o ranking de vendas e participação.
- **Pagamentos:** Integração com métodos de pagamento.
- **Redes Sociais:** Integração para divulgação.

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, TypeScript, Vite, Tailwind CSS.
- **Backend/Database:** Supabase.
- **Outros:** Lucide React (ícones), Recharts (gráficos), Motion (animações).

## 📦 Instalação e Execução Local

1.  **Clone o repositório:**
    ```bash
    git clone https://github.com/seu-usuario/digrifa.git
    cd digrifa
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente:**
    - Copie o arquivo `.env.example` para `.env`:
      ```bash
      cp .env.example .env
      ```
    - Preencha as variáveis no arquivo `.env` com suas chaves do Supabase e outras configurações.

4.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    O projeto estará rodando em `http://localhost:3000`.

## 🚢 Deploy

### Vercel

Este projeto está configurado para deploy fácil na Vercel.

1.  Instale a Vercel CLI ou conecte seu repositório GitHub na dashboard da Vercel.
2.  Certifique-se de configurar as variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.) nas configurações do projeto na Vercel.
3.  O arquivo `vercel.json` já está configurado para lidar com rotas de SPA (Single Page Application).

### GitHub Pages (Alternativa)

Se preferir GitHub Pages, será necessário ajustar o `vite.config.ts` (base path) e usar um fluxo de action específico.

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
