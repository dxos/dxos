# Environments

## Notes

- CF Pages supports a `preview` and `production` environment per project (unlike Workers, which can have any number of environments).
- Multiple Custom Domains can be associated with a Pages project.
- - https://developers.cloudflare.com/pages/how-to/custom-branch-aliases
- Secrets are managed via `wrangler pages secret list` (and `./scripts/put_secrets.sh`)

| GH Branch    | CF Page Name   | CF Environment | Cloudflare Subdomain     | Cloudflare Alias (Custom Domain) |
| ------------ | -------------- | -------------- | ------------------------ | -------------------------------- |
| `production` | `composer-app` | `production`   | `composer-app.pages.dev` | https://composer.space           |
| `staging`    | `composer-app` | `preview`      | `composer-app.pages.dev` | https://staging.composer.space   |
| `testing`    | `composer-app` | `preview`      | `composer-app.pages.dev` | https://testing.composer.space   |
| `main`       | `composer-app` | `preview`      | `composer-app.pages.dev` | https://dev.composer.space       |
