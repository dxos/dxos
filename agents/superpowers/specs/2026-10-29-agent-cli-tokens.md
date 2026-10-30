# Agent CLI sessions — design

An agent that already holds a Composer MCP session hands that session to the `dx` CLI in its shell.
The CLI then runs queries, scripts and blob transfers and writes the results to files and pipes.
With MCP alone every byte of a result passes through the model; with the CLI only the agent's
summaries do.

The CLI gets **the same permissions as the MCP session** — same identity, HALO space and spaces. It
is a different transport for one grant, not a new authorization, so there is no approval step.

## 1. Flow

```
agent shell (dx)                  agent's MCP connection             mcp-space-service (EDGE)
----------------                  ----------------------             ------------------------
dx mcp delegate
  POST /register (public client) ──────────────────────────────────► client_id
  PKCE verifier → ~/.local/state/dx/<profile>/mcp/<host>.pending (0600)
  prints { clientId, codeChallenge }
                                   delegateToCli({ clientId,
                                     codeChallenge }) ─────────────► completeAuthorization(
                                                                       props = caller's grant props
                                                                               + delegated: true,
                                                                       PKCE challenge)
                                   ◄──────────────────────────────── { code }
dx mcp delegate --code <code>
  POST /token (authorization_code + verifier) ─────────────────────► access + refresh token
  writes <host>.json (0600), deletes .pending                        (refresh TTL 24h for delegated grants)
  prints { connected: true }

dx mcp call <tool> --input '{…}' | jq … > out.json     (refreshes on 401 like any session)
```

Why this is safe without consent:

- **No widening.** The tool copies the caller's own grant props (`IdentityContext`); the CLI cannot
  name spaces. A caller authenticated by API token delegates the props that token resolved to.
- **The code that passes through the model is useless on its own.** It is bound to the PKCE
  challenge, and only the CLI that printed the challenge holds the verifier.
- **The tokens never enter the model's context.** `dx mcp delegate` writes them to the profile and
  prints only `connected`.
- **Short-lived.** Delegated grants get a 24h refresh lifetime (interactive grants: 30 days),
  set in the provider's `tokenExchangeCallback`. Each delegation is a separate grant, revocable
  with the provider's `revokeGrant`.

Shortcut for agents that already hold an API token (`COMPOSER_MCP_TOKEN` from plugin-claude, a CI
secret): set `DX_API_TOKEN` and skip delegation. `dx mcp tools` / `dx mcp call` then send it as
the bearer.

## 2. What the CLI can do through it

Everything the MCP server exposes, with results on stdout:

| Need                    | Call                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| Query objects to a file | `dx mcp call invokeOperation --input '{…query…}' > objects.json`          |
| Evaluate a script       | `dx mcp call runScript --input '{…}'` (runs in compute-service's sandbox) |
| Download a blob         | `dx mcp call createDownload …` → signed URL → `curl -o`                   |
| Upload a blob           | `dx mcp call createUpload …` → signed URL → `curl -T`                     |

Later: a token-backed headless ECHO client that replicates a space through the db-service replicator
and queries it locally, for jobs too large to do one call at a time.

## 3. Distribution

`moon run cli:bundle` builds the bun `--compile` binaries; `scripts/publish-r2.ts` uploads them to
the `agent-artifacts` R2 bucket:

```
cli/<version>/dx-<platform>-<arch>[.exe]
cli/<version>/SHA256SUMS
cli/<version>/install.sh
cli/latest.json
cli/install.sh
```

A cloud environment's setup script installs it with:

```bash
curl -fsSL https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev/cli/install.sh | sh
```

`install.sh` picks the platform, verifies SHA-256, and installs to `$HOME/.local/bin/dx`
(`DX_INSTALL_DIR`, `DX_VERSION`). The r2.dev URL is rate-limited; a custom domain on the bucket
should come before setup scripts depend on it.

## 4. Changes

| Repo | Change                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------- |
| edge | `mcp-space-service`: `delegateToCli` tool (`src/mcp/cli-tools.ts`); 24h refresh TTL for delegated grants (`src/main.ts`). |
| dxos | `dx mcp delegate [--code]`; `DX_API_TOKEN` / `DX_MCP_URL` in `dx mcp tools/call`.                                         |
| dxos | `cli/scripts/install.sh`, `cli/scripts/publish-r2.ts`; `--type` in the hosting-artifacts upload script.                   |

Follow-ups: a CI job that runs `publish-r2.ts` on release; a custom domain for the bucket; a
`dx mcp revoke` that ends the delegated grant.
