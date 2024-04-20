# labs-workers

# TODO(burdon): Set-up 1Password `op` secrets integration; instead of env vars.
#  https://1password.com/downloads/command-line

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

### Backup

TODO(burdon): Output assumes table hasn't changed; can modify INSERT (values). JSON values?

```bash
mkdir -p /tmp/dx/workers
npx wrangler d1 export dev-users --no-schema=true --remote --output=/tmp/dx/workers/users.sql
```

### Configuring email delivery MailChannels

1. Configure [domain lockdown](https://support.mailchannels.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Send-API) for MailChannels email sending.
2. Add SPF records.

| Prop   | Name            | Value                                                                                              |
|--------|-----------------|----------------------------------------------------------------------------------------------------|
| `TXT`  | `_mailchannels` | `v=mc1 cfid=dxos.workers.dev`                                                                      |
| `TXT`  |                 | `v=spf1 mx include:_spf.protonmail.ch include:_spf.google.com include:relay.mailchannels.net ~all` |

Check TXT records have propagated:

```bash
dig @1.1.1.1 _mailchannels.dxos.org TXT
nslookup -type=TXT dxos.org
```

WARNING: THE FOLLOWING WITH DROP THE REMOTE DATABASE.

```bash
npx wrangler d1 execute dev-users --remote --file=./sql/schema.sql
npx wrangler d1 execute dev-users --remote --command="SELECT * FROM Users"

# Create Admin API_KEY
openssl rand -hex 32
npx wrangler secret put API_KEY

# Create JWT_SECRET
openssl rand -hex 32
npx wrangler secret put JWT_SECRET

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
