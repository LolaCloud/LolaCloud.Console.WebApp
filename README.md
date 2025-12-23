# LolaCloud Console (WebApp) 🚀

O **LolaCloud Console** é o centro de comando da plataforma **Lola**, um ecossistema _Platform as a Service_ (PaaS) modular e self-hosted. Desenvolvido para oferecer uma experiência de nuvem soberana, o console combina uma interface técnica de alta performance com um design moderno e intuitivo.

Este repositório contém o **Frontend**, focado em oferecer uma gestão declarativa de infraestrutura e um controle rigoroso de identidade.

## 🎨 Identidade Visual & UI/UX

A interface foi projetada para profissionais de infraestrutura, focando em clareza e eficiência:

* Tema "Cloud Dark": Uma paleta de cores escuras e sofisticadas para reduzir a fadiga visual.

* Acentos em Magenta: Uso da cor institucional para destaques, botões de ação e estados ativos, conferindo uma personalidade única à LolaCloud.

* Tipografia Técnica: Utilização da fonte Nunito Sans para garantir legibilidade em dados densos e logs.

* Componentes Modernos: Construído sobre a Origin UI e Shadcn/UI, garantindo consistência e acessibilidade.

## ✨ Funcionalidades Atuais (MVP)

Atualmente, o console foca no módulo **Lola Core Identity (LCI)**:

* **Autenticação Segura**: Fluxo completo de login com proteção de rotas via JWT.

* **Gestão de Operadores**: Listagem, criação e edição detalhada de usuários do sistema.

* **RBAC (Role-Based Access Control)**: Interface para gerenciamento de papéis e permissões granulares.

* **Navegação Inteligente**: Sidebar lateral organizada por serviços com suporte a breadcrumbs para localização rápida.

## 🛠️ Tecnologias de Ponta

* **Framework**: React 19 (Suporte nativo ao novo compilador)

* **Build Tool**: Vite 7 (O estado da arte em performance de desenvolvimento)

* **Estilização**: Tailwind CSS 4 (Motor de alta velocidade com suporte a variáveis CSS nativas)

* **Gestão de Estado**: TanStack Query (Cache e sincronização de dados do servidor)

* **Formulários**: React Hook Form + Zod

## 🚀 Como Executar

1. **Instalar Dependências**: `npm install`
2. **Desenvolvimento**: `npm run dev` (Acesso em http://localhost:5173)
3. **Build de Produção**: `npm run build`