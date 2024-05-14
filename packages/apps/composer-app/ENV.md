# Environments

## Notes

- CF Pages supports a `preview` and `production` environment per project, unlike Workers, which can have any number.

| GH Branch    | CF Page Name    | CF Environment | Cloudflare                     | Netlify                           |
|--------------|-----------------|----------------|--------------------------------|-----------------------------------|
| `production` | `composer-prod` | `production`   | https://composer.space         | https://composer.dxos.org         |
| `staging`    | `composer-prod` | `preview`      | https://staging.composer.space | https://composer.staging.dxos.org |
| `testing`    | `composer-dev`  | `production`   | https://testing.composer.space | N/A                               | 
| `main`       | `composer-dev`  | `preview`      | https://dev.composer.space     | https://composer.dev.dxos.org     |

Plan

- [ ] Retire `beta` branch (move to production).
- [ ] Configure and align production and staging environments.
- [ ] How are secrets managed?
