# One Barber 💈

O **One Barber** é um sistema moderno de gestão em modelo SaaS criado exclusivamente para otimizar o fluxo de trabalho de Barbearias e Salões de Beleza. 

## 🛠 Tecnologias Principais

- **Vite** & **React 18** (TypeScript)
- **Tailwind CSS** & **Shadcn UI**
- **React Query** para gestão de estados
- **Supabase** (PostgreSQL e Edge Functions) para backend e segurança

## 🚀 Como Iniciar

Siga as etapas abaixo para rodar o ambiente de desenvolvimento local:

1. Clone e entre no projeto:
   ```sh
   git clone https://github.com/MateuSpatano/onebarber-66d10d22.git
   cd onebarber
   ```

2. Instale as dependências com `npm`:
   ```sh
   npm install
   ```

3. Configure o arquivo `.env` baseado no `README` (Supabase URL e Anon Key).

4. Inicie o servidor:
   ```sh
   npm run dev
   ```

5. Acesse localmente via `http://localhost:8080`.

## 📁 Estrutura de Rotas

O sistema lida com três personas de forma isolada:
- `/admin` — Painel Master de gerenciamento de Tenants (Estabelecimentos).
- `/dashboard` — Painel Tenant (Uso diário pela Barbearia/Gestores).
- `/client` — Portal Client-Facing para agendamentos online.

---
_Desenvolvido para revolucionar o ecossistema de beleza._
