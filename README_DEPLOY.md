# CRM Ferreiro V2 — Deploy

## Un solo comando para desplegar

```bash
cd crm-v2
npx vercel --prod
```

Cuando te pregunte:
- Set up and deploy? → Y
- Which scope? → ricardos-projects-1b63c753
- Link to existing project? → N (crear nuevo)
- Project name → crm-ferreiro-v2
- Directory → ./

## Variables de entorno (añadir en Vercel dashboard)

```
VITE_SUPABASE_URL = https://qsjiutfnhbgkynvaqnrn.supabase.co
VITE_SUPABASE_ANON_KEY = sb_publishable_TBuRpkJals9bq98GzFlkFw_6x3_3R8X
```

O desde CLI:
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel --prod
```
