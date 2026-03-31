# Deploy

## 1. Firebase

Crie um projeto no Firebase e ative:

- Authentication
- Firestore Database

No Authentication:

- habilite `Email/senha`
- crie manualmente o usuário super admin `admin@damp3d.com`

No Firestore:

- publique as regras do arquivo [firestore.rules](/c:/Users/mathe/Desktop/01.%20Damp3D/005.Sites/INDICA%C3%87%C3%83O%20PREMIADA/firestore.rules)

## 2. Variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha:

- `VITE_DATA_MODE=firebase`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Para as funções da Vercel, também configure:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

## 3. Teste local com Firebase

```powershell
npm.cmd run build
```

Se quiser testar local apontando para Firebase, ajuste o `.env.local` ou `.env` para `VITE_DATA_MODE=firebase`.

## 4. Deploy na Vercel

1. Suba o projeto para um repositório GitHub.
2. Importe o repositório na Vercel.
3. Em `Settings > Environment Variables`, cadastre todas as variáveis do `.env.example`.
4. Faça o deploy.

## 5. Domínio

Se usar Cloudflare:

1. adicione o domínio na Vercel
2. copie os registros DNS sugeridos pela Vercel
3. crie esses registros no Cloudflare

## 6. Checklist final

- login do super admin funcionando
- criação de loja funcionando
- página pública carregando pela slug da loja
- cadastro de indicação funcionando
- painel da loja lendo e gravando no Firestore
- funções `/api/store-auth` e `/api/store-reset-link` funcionando
