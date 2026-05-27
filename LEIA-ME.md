# Travel Looks — Como rodar

## Requisitos
- Node.js instalado (https://nodejs.org)

## Passos

```bash
# 1. Entre na pasta do projeto
cd travel-looks-app

# 2. Instale as dependências (só na primeira vez)
npm install

# 3. Rode o app
npm run dev
```

Abra http://localhost:5173 no navegador.

## Para usar no celular (mesma rede Wi-Fi)
Após `npm run dev`, o terminal mostrará algo como:
  ➜  Network: http://192.168.x.x:5173

Abra esse endereço no celular — funciona direto!

## Para build de produção (hospedar online)
```bash
npm run build
```
A pasta `dist/` pode ser hospedada em Vercel, Netlify ou Firebase Hosting (gratuitos).
