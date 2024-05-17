# Environments

## Notes

- CF Pages supports a `preview` and `production` environment per project (unlike Workers, which can have any number of environments).
- Multiple Custom Domains can be associated with a Pages project.
- 
  - https://developers.cloudflare.com/pages/how-to/custom-branch-aliases
- Secrets are managed via `wrangler pages secret list` (and `./scripts/put_secrets.sh`)

| GH Branch    | CF Page Name   | CF Environment | Cloudflare Subdomain     | Cloudflare Alias (Custom Domain) | Netlify (Deprecated)              |
|--------------|----------------|----------------|--------------------------|----------------------------------|-----------------------------------|
| `production` | `composer-app` | `production`   | `composer-app.pages.dev` | https://composer.space           | https://composer.dxos.org         |
| `staging`    | `composer-app` | `preview`      | `composer-app.pages.dev` | https://staging.composer.space   | https://composer.staging.dxos.org |
| `testing`    | `composer-app` | `preview`      | `composer-app.pages.dev` | https://testing.composer.space   | N/A                               | 
| `main`       | `composer-app` | `preview`      | `composer-app.pages.dev` | https://dev.composer.space       | https://composer.dev.dxos.org     |

