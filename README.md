# Poker Planning

Poker Planning é uma plataforma gratuita e moderna para estimativas ágeis usando Planning Poker. Ideal para times de desenvolvimento, squads e empresas que buscam agilidade, transparência e colaboração.

## Funcionalidades
- Estimativas em tempo real
- Não precisa de cadastro
- 100% gratuito e ilimitado
- Interface moderna e fácil de usar

## Como rodar localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (recomendado v18 ou superior)
- [Git](https://git-scm.com/)

### Passos

1. **Clone o repositório:**

```bash
git clone https://github.com/seu-usuario/planningpoker.git
cd planningpoker
```

2. **Instale as dependências:**

```bash
npm install
cd server && npm install
cd ..
```

3. **Inicie o servidor e o front-end juntos:**

```bash
npm run start
```

- O front-end estará disponível em [http://localhost:5173](http://localhost:5173)
- O back-end (API) estará rodando em [http://localhost:3001](http://localhost:3001)

## Scripts úteis
- `npm run dev` — roda apenas o front-end
- `npm run server` — roda apenas o back-end
- `npm run start` — roda ambos simultaneamente

## Deploy
Você pode fazer deploy em qualquer serviço que rode Node.js, como Vercel, Netlify, Heroku, Railway, etc.

## Licença
MIT
