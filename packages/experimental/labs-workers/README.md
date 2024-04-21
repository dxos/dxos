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
npx wrangler d1 execute dev-users --local --json --command="SELECT * FROM Users"
```

## Production

```bash
npx wrangler deploy
npx wrangler tail
```

Deployed to: https://labs-workers.dxos.workers.dev

### Backup

TODO(burdon): Output assumes table hasn't changed; can modify INSERT (values). JSON values?

```bash
mkdir -p /tmp/dx/workers
npx wrangler d1 export dev-users --no-schema=true --remote --output=/tmp/dx/workers/users.sql
```

### Configuring MailChannels for email delivery

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
npx wrangler d1 execute dev-users --remote --json --command="SELECT * FROM Users"
```

### Secrets management

Create and configure API Key and JWT Secrets.

```bash
# Create Admin API_KEY
openssl rand -hex 32
npx wrangler secret put API_KEY

# Create JWT_SECRET
openssl rand -hex 32
npx wrangler secret put JWT_SECRET

curl -s -v -H "X-API-KEY: xxx" http://localhost:8787/api/users | jq
```

Get API KEY from 1password:

```bash
export DX_API_KEY=$(op item get "Cloudflare" --fields label="DX_API_KEY")
```

## References

Cloudflare Workers (`workerd`)

- https://developers.cloudflare.com/d1/get-started
- https://developers.cloudflare.com/workers/tutorials
- https://upstash.com/docs/redis/overall/getstarted
