# @dxos/storybook-react

Storybook config package for the DXOS monorepo.

## Local Development

Run the storybook dev server (port 9009):

```bash
moon run storybook-react:serve
```

Run vitest against stories (with the dev server running):

```bash
pnpm test-storybook --url http://127.0.0.1:9009 -- --watch
```

Verify a static build locally:

```bash
moon run storybook-react:bundle
npx http-server ./out/storybook-react
```

## Deployment

The storybook is published to **https://dxos-storybook.pages.dev** via Cloudflare Pages.

### CI (automatic)

The `.github/workflows/storybook-deploy.yml` workflow runs on every push to `main` and:
1. Builds the storybook bundle (`moon run storybook-react:bundle`)
2. Deploys via `wrangler pages deploy` to the `dxos-storybook` CF Pages project

Requires the following repository secrets: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.

You can also trigger a deploy manually from the GitHub Actions UI using the **workflow_dispatch** event.

### Manual publish

Prerequisites: `wrangler` installed and authenticated (`wrangler login`).

```bash
# From the repo root — build first
moon run storybook-react:bundle

# Then deploy from the storybook-react directory
cd tools/storybook-react
wrangler pages deploy out/storybook-react --project-name dxos-storybook --branch main
```

The `--branch main` flag ensures the deploy updates the production URL (`dxos-storybook.pages.dev`).
Omit it (or use a different name) to create a preview deployment instead.

### Cloudflare Pages project

- **Project name**: `dxos-storybook`
- **Production URL**: https://dxos-storybook.pages.dev
- **Build output directory**: `tools/storybook-react/out/storybook-react`
- **Config**: [`wrangler.toml`](./wrangler.toml)
