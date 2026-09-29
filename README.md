# ⚽ Pelada Top - Football Match Manager

> **Sua resenha organizada.** Aplicativo web progressivo (PWA) para gerenciamento completo de partidas de futebol com check-in por geolocalização, sorteio inteligente de equipes, escalação com numeral gigante no celular de cada jogador e cronômetro oficial de 10 minutos.

---

## 🌟 Principais Funcionalidades

- 📍 **Check-in Inteligente com GPS**: Confirmação de presença baseada na proximidade real do campo (restrito a um raio de 500 metros).
- 🔀 **Sorteio Balanceado de Equipes**: Divisão automática de 2 a 5 times equilibrando as idades e distribuindo goleiros de forma justa.
- 📢 **Escalação Oficial com Numeral Gigante**: Ao escalar as equipes, cada jogador vê em destaque na tela do seu celular o número do seu time e seus companheiros.
- ⏱️ **Cronômetro Oficial de 10 Minutos**:
  - Trava inteligente: o botão Play só é liberado após a escalação oficial.
  - Apito clássico de juiz sintetizado via Web Audio API.
  - Alerta visual e vibração tátil ao final do tempo regulamentar.
- 🛠️ **Painel do Administrador**:
  - Liberar ou travar a lista de presença (vestiário).
  - Adicionar, editar e remover atletas.
  - Configurar local e coordenadas oficiais com integração ao Google Maps.
- 📱 **Compatibilidade Multiplataforma Total**:
  - 100% responsivo e otimizado para **Celulares (iOS e Android)**, **Tablets (iPad e Android)** e **Desktop (Windows, macOS e Linux)**.
  - PWA instalável offline-first com Service Worker e sincronização em tempo real via Server-Sent Events (SSE).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5 Semântico, Tailwind CSS, JavaScript Moderno (Vanilla ES6+).
- **APIs Web**: Geolocation API, Web Audio API (apito sonoro), Service Worker API, Notification & Vibration API.
- **Backend**: Node.js com HTTP nativo e Server-Sent Events (SSE) para tempo real sem dependências externas pesadas.
- **Armazenamento**: Persistência local em arquivo JSON (`pelada-dados.json`) e sincronização cliente-servidor.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) instalado na máquina.

### Execução Rápida (Windows)
Basta dar dois cliques no arquivo:
```bash
iniciar-app.bat
```

### Via Terminal
```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/pelada-top.git

# 2. Acesse a pasta do projeto
cd pelada-top

# 3. Inicie o servidor
node server.js
```
Abra no navegador em: `http://localhost:3000` ou `http://localhost:8080`.

---

## 🧪 Página de Teste & Diagnóstico do Servidor (Tema Claro)

Painel técnico e sandbox com suporte completo a Server-Sent Events (SSE), Geofencing de 500m, simulação de presença de atletas e telemetria em tempo real.

### Estrutura de Arquivos:
```
├── server.js (Node.js + SSE stream + REST API v2)
├── public/
│   ├── index.html (Página de Teste & Diagnóstico High-Energy Athletic Light)
│   ├── css/style.css (Design tokens e fontes oficiais)
│   └── js/app.js (SSE stream, Geofence 500m, ping RTT e cadastro de atletas)
└── README.md
```

### Execução e Acesso:
```bash
# Instalação e execução
npm install express cors
node server.js
```
- **Acesso ao Painel de Testes**: [http://localhost:3000/teste](http://localhost:3000/teste)
- **App Principal**: [http://localhost:3000/](http://localhost:3000/)
- **Painel Master Admin**: [http://localhost:3000/painel](http://localhost:3000/painel)

### Endpoints da API de Teste:
- `GET /api/v2/ping`: Verificação de status e RTT de latência.
- `GET /events/match-stream`: Endpoint de streaming SSE em tempo real.
- `POST /api/v2/athletes`: Cadastro de novos atletas na base.
- `POST /api/v2/geofence-test`: Validação da regra de proximidade de 500 metros.

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

