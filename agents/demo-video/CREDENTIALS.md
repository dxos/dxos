# Credentials for the demo-video work

`HEYGEN_API_KEY` (avatar/voice renders) and `IDEOGRAM_API_KEY` (generated stills), plus the
existing AI and Cloudflare keys. All resolved from 1Password — never in chat, never in a
tracked file.

## How it works

`.env.tpl` at the repo root holds `op://` references only, no values. It is **gitignored**
(`.gitignore:89`) and untracked. Generate the real file with:

```bash
op inject -i .env.tpl -o .env
```

`.env` is gitignored (`.gitignore:87`) and written `0600`. To load into a shell instead of a
file:

```bash
eval "$(op inject -i .env.tpl)"
```

Current state: **generated and verified — all nine variables resolve to non-empty values.**

## Three things that were wrong, and how they were fixed

Worth recording, because each would recur on another machine.

1. **`op://CI Vault/…` — no such vault.** The vault is named `CI`. `op` reported it precisely;
   the fix was a rename in every reference.
2. **Two items titled `HeyGen` in the Employee vault — one live, one ARCHIVED.** `op inject`
   resolved the archived one and failed with "it has been deleted or archived". Title lookup is
   ambiguous whenever an archived duplicate exists, so **HeyGen and Ideogram are now referenced
   by item ID, not title**:
   - `op://Employee/pewtgrrxyrrpldhwafmb25gpuu/credential` (HeyGen)
   - `op://Employee/yionmgzrv5aqoox6rypt3fchcm/credential` (Ideogram)

   Tidying the archived duplicate in 1Password would let these go back to titles. Until then
   the IDs are the only stable reference.

3. **Values were unquoted.** `eval "$(op inject -i .env.tpl)"` breaks on any secret containing
   a space or `$`. Every value is now quoted.

Also note `HeyGen` and `Ideogram` store the key in the standard **`credential`** field, not
`API_KEY` — unlike `Anthropic` and `OpenAI`, which do use `API_KEY`.

## The edge repo's template is separate

`.env.tpl` in the **`edge` repo** is the canonical template generating `.env` for the public
repos, and it carries only the CI-vault secrets (`DX_ANTHROPIC_API_KEY`, `CLOUDFLARE_API_TOKEN`,
`LINEAR_API_KEY`). Its primary checkout is on `main`, so the agent will not edit it. Nothing
here needs it — the root `.env.tpl` covers the video work — so leave it alone unless the media
keys need to reach CI.

## How keys reach Composer

**Automatically, from `.env` — no pasting.** A connector declares the environment variable holding
its key:

```ts
// packages/plugins/plugin-heygen/src/capabilities/connector.ts
source: HEYGEN_SOURCE,
envBinding: 'HEYGEN_API_KEY',
```

The dev server publishes the allowlisted keys as `import.meta.env.DX_SECRET_<NAME>`
(`composer-app/src/vite/dev-secrets.ts`), and plugin-connector's `EnvCredentials` module writes the
`AccessToken` + `Connection` pair the dialog would have written, into the default space. Idempotent
on `AccessToken.source`, so it is a no-op once a connection exists and a profile reset costs nothing.

**Verified end to end:** with the token deleted from every space, a cold boot re-provisioned
`heygen.com` into the default space within 30 s, and the key authenticates against HeyGen
(`/v3/voices` → 200, 4 private voices).

Adding a connector to the mechanism is two lines: `envBinding` on the connector entry, and the
variable name in `EXPOSED` in `dev-secrets.ts`.

### Why it is dev-only

`devSecrets` returns `{}` unless `command === 'serve'`. The values are inlined at transform time, so
a production bundle would ship them to anyone who loads the page — gating on the vite command makes
that structural rather than a runtime flag someone can flip. `EXPOSED` is an explicit allowlist, not
"everything in `.env`", because that file also holds Cloudflare, AWS and GitHub credentials no
browser should ever see.

### Two framework details worth keeping

- `manager.enable()` returns an **Effect, not a Promise**. Awaiting it silently does nothing and
  reports no error; run it with `Effect.runPromise`.
- `ConnectorEvents.Start` is demand-driven — it did not arrive within 150 s of an idle tab, so a
  module hung off it never runs at boot. `EnvCredentials` activates on `SpacesReady` and activates
  the connector event itself, after an early return that leaves a secret-less build untouched.

### The manual fallback

`.claude/scripts/keyserve.py` hands one allowlisted secret to a local browser page over loopback
(random single-use URL token, `127.0.0.1`, exits after the first read or 180 s). It needs the
permission rule `Bash(python3 .claude/scripts/keyserve.py:*)`. Superseded by the mechanism above for
connectors, but still the tool for getting a secret into a page that has no connector.
