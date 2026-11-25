<p align="center">
  <img src="./docs/assets/logo.png" alt="Lola Cloud Logo" width="150" />
</p>

<h1 align="center">Lola Cloud • Console WebApp</h1>

<p align="center">
  <strong>Interface Web Unificada de Gerenciamento da Plataforma Lola Cloud (Equivalente ao AWS Management Console)</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/AWS_Cloudscape-Design_System-FF9900?style=flat-square&logo=amazonwebservices&logoColor=white" alt="AWS Cloudscape" />
  <img src="https://img.shields.io/badge/Port-5173-blue?style=flat-square" alt="Port 5173" />
</p>

---

## 📌 Visão Geral

O **Lola Console** é a interface gráfica oficial de administração de toda a infraestrutura da **Lola Cloud**. Construído como uma SPA (*Single Page Application*) moderna, rápida e responsiva, o console adota rigorosamente o **AWS Cloudscape Design System**, proporcionando a mesma experiência visual corporativa, consistência e ergonomia do console oficial da AWS.

A aplicação comunica-se diretamente com todos os 5 microsserviços de backend da plataforma através de um cliente HTTP unificado com interceptores de autenticação JWT, suporte dinâmico a temas (*Dark Mode* / *Light Mode*) e controle de sessão resiliente.

---

## 🏗️ Arquitetura & Módulos da Interface

O console unifica os seguintes domínios da nuvem Lola em uma única experiência:

- 🛡️ **IAM & Operadores (`LCI`)**: Gerenciamento de operadores, concessão de permissões RBAC (`servico::recurso::acao`), playground de políticas e auditoria de sessões ativas com revogação remota.
- 🌐 **Edge & DNS (`Runway`)**: Gerenciamento de credenciais Cloudflare, sincronização de zonas DNS, painel de túneis Zero Trust (`cloudflared`) com status em tempo real e monitoramento DDNS (Auto-IP Fix).
- 🗄️ **Databases DBaaS (`Relate`)**: Criação e ciclo de vida de bancos de dados gerenciados (PostgreSQL, MySQL, SQL Server), visualização de rotas Traefik HostSNI, inicialização, parada, reinício, logs e gestão de snapshots com restauração em 1-clique.
- 🪣 **Object Storage (`Store`)**: Criação e administração de buckets S3, visualização de diretórios e arquivos com upload/download direto via Presigned URLs (MinIO) e proteção de buckets de sistema.
- 📊 **Telemetria & Logs (`Journal`)**: Exploração de Log Groups e Log Streams com recurso **Live Tail** em tempo real via Server-Sent Events (SSE) direto dos contêineres Docker e gráficos de telemetria.

---

## 🛠️ Stack Tecnológica

- **Framework**: React 19 (`react: ^19.2.8`, `react-dom: ^19.2.8`)
- **Linguagem**: TypeScript (`~6.0.2`)
- **Build Tool / Bundler**: Vite 8 (`vite: ^8.3.0`, `@vitejs/plugin-react: ^6.1.1`)
- **Design System**: AWS Cloudscape Design System (`@cloudscape-design/components`, `@cloudscape-design/global-styles`)
- **Roteamento**: React Router 7 (`react-router-dom: ^7.18.4`)
- **Cliente HTTP**: Axios com interceptores globais para injeção de tokens `Bearer` e captura de `401 Unauthorized`
- **Linter**: Oxlint (`oxlint: ^1.81.0`)

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 20+ ou 22+
- npm ou bun

### Instalação e Inicialização
```bash
# 1. Instalar dependências
npm install

# 2. Executar em ambiente de desenvolvimento
npm run dev
```

Acesse a aplicação no navegador em: **`http://localhost:5173`**  
Credenciais padrão de operador: **`root`** / **`root123`**
