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
Abra no navegador em: `http://localhost:8080` (ou acesse pelo IP local no celular conectado ao mesmo Wi-Fi).

---

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).
