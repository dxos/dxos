# Environments

## Notes

- CF Pages supports a `preview` and `production` environment per project, unlike Workers, which can have any number.

| GH Branch    | CF Page Name   | CF Environment | Cloudflare                     | Netlify                           |
|--------------|----------------|----------------|--------------------------------|-----------------------------------|
| `main`       | `composer-dev` | `preview`      | https://dev.composer.space     | https://composer.dev.dxos.org     |
| N/A          |                | `production`   | N/A                            | N/A                               | 
| `staging`    | `composer`     | `preview`      | https://staging.composer.space | https://composer.staging.dxos.org |
| `production` |                | `production`   | https://composer.space         | https://composer.dxos.org         |
