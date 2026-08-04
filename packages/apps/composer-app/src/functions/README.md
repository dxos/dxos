# Cloudflare Worker

`_worker.ts` is the Worker entry (see `wrangler.jsonc`); static assets are served via the `ASSETS` binding.

NOTE: Separate `tsconfig.json` for server-side code.

## Development

Build the bundle from root:

```bash
moon run composer-app:bundle
```

Run the Worker from the app directory:

```bash
wrangler dev
```

## Logs

Tail production logs:

```bash
wrangler tail composer
```
