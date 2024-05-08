# Environments

## Notes

- CF Pages supports a `preview` and `production` environment per project, unlike Workers, which can have any number.

| Branch       | CF Page Naem   | CF Environment | Cloudflare                     | Netlify                           |
|--------------|----------------|----------------|--------------------------------|-----------------------------------|
| `main`       | `composer-dev` | `preview`      | https://dev.composer.space     | https://composer.dev.dxos.org     |
| `testing`    |                | `production`   | https://testing.composer.space | N/A                               | 
| `staging`    | `composer`     | `preview`      | https://staging.composer.space | https://composer.staging.dxos.org |
| `production` |                | `production`   | https://composer.space         | https://composer.dxos.org         |

Plan

- [ ] Retire `beta` branch.
- [ ] Configure staging for CF Pages (support ticket due to limit reached): increased to 20
- [ ] Configure and align production and staging environments.
- [ ] How are secrets managed?
