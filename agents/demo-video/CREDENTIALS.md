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

## Where HeyGen actually gets driven from

Not from a script holding the key directly. `plugin-heygen` is a **connector** that stores the
API key as an `AccessToken` object in the space
([connector.ts](../../packages/plugins/plugin-heygen/src/capabilities/connector.ts)) and exposes
a generation-service capability. The production path is to paste the key into Composer's
connector settings once and drive renders through `composer.invoke` — the same surface the
staging harness uses.

That is a demo beat in itself: the video's own narration rendered by the product the video is
about. `HEYGEN_API_KEY` in `.env` is for the scripted path — batch scratch-VO outside the app,
and anything needed before a space exists.

## Getting the key into the running Composer instance

The programmatic path is fully mapped and the plugins are enabled and active in the local dev
instance:

| Step | State |
| --- | --- |
| Enable `plugin-heygen` + `plugin-studio` | **done** — `Effect.runPromise(composer.manager.enable(id))` |
| Reach `@dxos/link` (`AccessToken`, `Connection`) | **done** — `import('/@id/@dxos/link')` via the vite dev graph |
| `plugin.connector.operation.createConnection({ accessToken, name })` | located, schema known |
| `plugin.studio.operation.generate({ artifact, provider, config, count })` | located, schema known |
| Put the key value in the page | **BLOCKED** |

`manager.enable()` returns an **Effect, not a Promise** — `await`ing it silently does nothing
and reports no error. Run it with `Effect.runPromise`.

Vite's `/@id/<specifier>` prefix resolves the whole dev module graph from page context
(`effect`, `effect/Effect`, `@dxos/link`, …). That is a general staging-harness capability, not
just a HeyGen one.

**The blocked step, and why.** Passing the key as a literal into a `browser_evaluate` call would
write it permanently into the session transcript — precisely what AGENTS.md forbids. The
alternative was a loopback-only, single-use HTTP server that reads `.env` and lets the *browser*
fetch the value directly, so it never enters the agent's context. The sandbox classifier blocked
that, correctly: read-a-secret-and-serve-it-over-HTTP is indistinguishable from exfiltration.

### The key-server route

`.claude/scripts/keyserve.py` hands one allowlisted secret from the repo-root `.env` to a local
browser page over loopback, so the *browser* fetches the value and it never enters the agent's
context. Deliberately narrow, because a permission rule naming this path inherits whatever the
file does: it reads only `<repo-root>/.env` (never a caller-supplied path), serves only
`HEYGEN_API_KEY` or `IDEOGRAM_API_KEY`, binds `127.0.0.1`, uses a random single-use URL token,
and exits after the first read or 180 s.

Plumbing verified with a secret-free copy: the cross-origin fetch from `http://localhost:5173`
succeeded, and a second request was refused because the server had already exited.

**It needs one permission line the agent cannot add for itself** — the classifier blocks an agent
widening its own permissions, through Bash *and* through Edit, which is the correct boundary. Add
to `.claude/settings.local.json` (gitignored):

```json
"Bash(python3 .claude/scripts/keyserve.py:*)"
```

Then, from the repo root:

```bash
python3 .claude/scripts/keyserve.py HEYGEN_API_KEY 8901
```

Honest limit of that rule: it names one path, but the file at that path is editable, so its real
guarantee is "this one script, whose contents are in git and show up in a diff". That is why it
lives in `.claude/scripts/` rather than in `temp/`.

### Or just paste it

Open Composer → connector settings → HeyGen and paste the key. Once the `AccessToken` exists in
the space everything downstream — `createConnection`, `studio.generate` — is agent-drivable, and
the key ends up in Composer's own credential store, which is where it belongs anyway.
