# labs-workers

## Set-up

```bash
npx wragler login
npx wrangler whoami
```

```bash
npx wrangler d1 create dev-users
```

```bash
npx wrangler d1 execute dev-users --local --file=./sql/schema.sql
npx wrangler d1 execute dev-users --local --command="SELECT * FROM Users"
```

https://labs-workers.dxos.workers.dev

## Production

```bash
npx wrangler deploy
npx wrangler tail
```

WARNING: THE FOLLOWING WITH DROP THE REMOTE DATABASE.

```bash
npx wrangler d1 execute dev-users --remote --file=./sql/schema.sql
npx wrangler d1 execute dev-users --remote --command="SELECT * FROM Users"

# Secrets management
npx wrangler secret put API_KEY

curl -s -v -H "X-API-KEY: xxx" http://localhost:8787/api/users | jq
```

## Design

- CF worker checks cookie.
- If present streams app HTML.
  - App checks cookie and bails if not present.
- If not set redirects to signup page (Website)
  - Posts email address to worker that manages DB (D1 or Upstash REDIS or Superbase).
- Admin creates magic one-time link with token.
  - Link adds cookie.
  - Adds credential to HALO.
- HALO panel generate magic link for devices.


## References

Cloudflare Workers (workerd)

- https://developers.cloudflare.com/d1/get-started/
- https://developers.cloudflare.com/workers/tutorials/
- https://upstash.com/docs/redis/overall/getstarted
