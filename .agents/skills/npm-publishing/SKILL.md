---
name: npm-publishing
description: Make a workspace package publishable on npm — the first (bootstrap) publish of a new `@dxos/*` package and its npm trusted publisher (OIDC) for `publish-all.yml`, via `scripts/publish-package.mjs`. Use when asked to publish a package to npm, make a package public, set up or fix a package's trusted publisher, or when the publish preflight (`check-packages-published`) fails. Also explains where regular releases (`@latest`, `@next`, pkg.pr.new) come from, which are never published by hand.
---

# npm publishing

Regular releases are automatic and never run on a laptop: `publish-all.yml` publishes `@latest` when the
"Version Packages" PR merges, and `@next` on manual dispatch; `pkg-pr-new.yml` publishes previews. The design
is in `.github/RELEASE-SPEC.md`, the runbook in `REPOSITORY_GUIDE.md` §Releasing, changesets in
`agents/instructions/changesets.md`.

The one manual job is **bootstrapping a package**: npm can attach a trusted publisher only to a package that
already exists on the registry, so each new package needs one manual publish and then a trusted-publisher
configuration. `scripts/publish-package.mjs` does both. Re-running it is safe: a package that is already on
npm skips the publish and only configures the trusted publisher.

## Procedure

### 1. Check the package

- `package.json` has no `"private": true` and has `"publishConfig": { "access": "public" }`. New packages are
  private by rule (AGENTS.md); removing the flag is a change the user asked for — say so in the PR.
- Every `@dxos/*` dependency the package needs is published already. `node scripts/publish-unpublished-packages.mjs --list`
  shows the unpublished ones. If there is more than one, use that script instead (see "Many packages").
- The worktree has `node_modules` (`pnpm install`); otherwise `pnpm publish` fails with
  `ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`.

### 2. Dry run (agent runs this)

```bash
node scripts/publish-package.mjs @dxos/<name> --dry-run --trust
```

It needs no npm session. Read the output: `Registry: not published` means step 3 publishes `0.0.0` then
restores the version in `package.json`; `already published` means only the trusted publisher is configured.

### 3. Ask the user how to configure the trusted publisher

1. **Automatic (recommended)** — the script runs `npm trust github` (npm ≥ 11.15, fetched with `npx` when the
   local npm is older). The user must authenticate: npm prints a URL and waits for a browser 2FA confirmation.
2. **Guided** — the script publishes (if needed), prints the settings and opens the package's npm access page;
   the user enters them by hand.

### 4. Run it in the user's terminal

The real run is interactive (`npm login` and the 2FA confirmation read from a TTY), so do not run it with the
Bash tool. Run it in the user's Terminal panel with `mcp__terminal__run_in_terminal`, or give the user the
command. npm needs ~40s before it prints the 2FA URL, then waits ~5 minutes: tell the user to press ENTER in
that tab as soon as the URL appears (an expired window ends in `E404 … /-/v1/done`; just re-run):

```bash
node scripts/publish-package.mjs @dxos/<name> --trust
```

For the guided option, drop `--trust`. Then read the terminal (`mcp__terminal__read_terminal`, with
`wait_for_output_ms`) to follow progress, and tell the user when the browser confirmation is pending.

Where `op` can read the `eng-ops` vault (a session with an operator's 1Password access; the agents'
service account reads only `eng-dev`), add `--op`:
`--trust --op` runs unattended as the [npm bot account](#npm-bot-account) — it logs in from 1Password,
answers each 2FA prompt with a fresh TOTP code, and revokes the session token on exit — so the Bash tool
can run it.

Manual settings, for the guided option or to check the automatic one on
`https://www.npmjs.com/package/@dxos/<name>/access` → Trusted Publisher → GitHub Actions:

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| Repository      | `dxos/dxos`                                  |
| Workflow file   | `publish-all.yml`                            |
| Environment     | blank                                        |
| Allowed actions | `npm publish` only — not `npm stage publish` |

### 5. Verify

```bash
npm view @dxos/<name> versions --json
```

```bash
pnpm check-packages-published
```

The trusted publisher has no unauthenticated read API; `npm trust list @dxos/<name>` needs a 2FA confirmation
too, so ask the user to check the access page only if the `--trust` run did not print
`Trusted publisher configured`.

### 6. Commit

The script restores `package.json` after the publish, so the only change to commit is the removal of
`"private": true` (plus any `publishConfig` fix). Add a changeset only if the PR also changes the package
(`agents/instructions/changesets.md`).

## npm bot account

The `npm-bot` npm account's credentials live in 1Password (`eng-ops` vault, record `com.npmjs`). Use the
references, never the values (`1password` skill):

| Field             | Reference                             |
| ----------------- | ------------------------------------- |
| Username          | `op://eng-ops/com.npmjs/BOT_USERNAME` |
| Password          | `op://eng-ops/com.npmjs/BOT_PASSWORD` |
| One-time password | `op://eng-ops/com.npmjs/BOT_TOTP`     |

A TOTP code lasts 30 seconds, so read it fresh for each npm command that asks for one (`--otp "$(op read -n
'op://eng-ops/com.npmjs/BOT_TOTP?attribute=otp')"`), never once for a loop.

## Many packages

`node scripts/publish-unpublished-packages.mjs` bootstrap-publishes every package that fails the gate, in
dependency order, at `0.0.0`. It does not configure trusted publishers: afterwards run
`node scripts/publish-package.mjs <name> --trust` for each package (each asks for its own 2FA confirmation),
or use the [npm-trusted-publisher](https://github.com/wittjosiah/npm-trusted-publisher) Chrome extension for
10+ packages.

## Troubleshooting

| Symptom                                                   | Cause / fix                                                                                                                                                                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EOTP` / "requires a one-time password"                   | Expected on `trust` and some publishes; complete the browser confirmation at the printed URL.                                                                                                                   |
| `trust` reports `permissions: publish, stage publish`     | npm adds stage publish even when only `--allow-publish` is passed (seen with npm 11.15.0). Harmless for `publish-all.yml`; to match the guide, untick it on the package's access page.                          |
| `Unknown command: "trust"`                                | npm < 11.15 called directly; the script uses `npx npm@11.15.0` — run it through the script.                                                                                                                     |
| `ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`              | Missing `node_modules`; run `pnpm install`.                                                                                                                                                                     |
| `publish-all.yml` fails with 404/ENEEDAUTH for a package  | No trusted publisher for it yet; run the script with `--trust`. The `preflight` job (`scripts/check-packages-published.ts`) now catches this before the build, for every package at once.                       |
| `E401 … token is invalid` on one package mid-publish      | Transient: preflight's OIDC exchange had passed for the same package. Re-run the failed job; `changeset publish` skips versions already on npm, so a re-run resumes the release.                                |
| `E409 … Cannot publish over previously staged version`    | npm is holding that version in **Validating** (automated review, shown on the package's Versions tab); nobody staged it and nothing needs approving. Wait until it shows Published, then re-run the failed job. |
| Release stops partway (`Some packages failed to publish`) | `changeset publish` stops at the first failure, so `latest` is left mixed across versions. Fix the named package, then re-run; tags and the CLI publish run only once every package succeeds.                   |

## Rules

- Never publish a real version by hand, and never run `changeset publish` locally — releases come from
  `publish-all.yml` only.
- Never ask the user for an npm token or password; npm's own browser flow handles auth.
- Never rename `publish-all.yml`: every trusted publisher is bound to that filename.
