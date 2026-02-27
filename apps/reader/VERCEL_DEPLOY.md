# Deploy reader to Vercel (flow-de0ch)

## One-time: set Root Directory

1. Open **https://vercel.com/de0chs-projects/flow-de0ch/settings**
2. Under **Root Directory**, set to: `apps/reader`
3. Click **Save**

## Deploy from repo root

```bash
cd /path/to/flow
pnpm dlx vercel --yes
```

Production:

```bash
pnpm dlx vercel --yes --prod
```
