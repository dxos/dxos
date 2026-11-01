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

The agent does every step except the npm sign-in and the browser approvals, which belong to the user's npm
account. A local agent cannot run the real publish itself: it is interactive, and the harness's permission check
refuses it as publishing. So the agent checks, dry-runs, hands over **two commands**, follows the user's terminal,
and verifies. In the cloud sandbox `--op` removes the user from the loop entirely (step 4).

### 1. Choose and check the packages

- List what is not on npm: `node scripts/publish-unpublished-packages.mjs --list`. It includes packages from other
  work; keep the ones this change makes public, plus any already-published package that still lacks a trusted
  publisher.
- Order them dependencies first (`@dxos/animation` before `@dxos/scene`, which depends on it): read each
  `package.json`'s `@dxos/*` dependencies.
- Each has no `"private": true` and has `"publishConfig": { "access": "public" }`. New packages are private by rule
  (AGENTS.md); removing the flag is a change the user asked for — say so in the PR.
- The worktree has `node_modules` (`pnpm install`); otherwise `pnpm publish` fails with
  `ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`.

### 2. Dry run (agent runs this)

One invocation takes every package, in the order given:

```bash
node scripts/publish-package.mjs @dxos/<a> @dxos/<b> --dry-run --trust
```

It needs no npm session. Per package, `Registry: not published` means the real run publishes `0.0.0` and restores
the version in `package.json`; `already published` means only the trusted publisher is configured.

### 3. Hand the user two commands

Sign-in first, on its own: inside the script the login URL scrolls past with the build output and the ~5-minute
window lapses (`npm error Exit handler never called!`, `npm login did not complete`).

```bash
npm login
```

Then one run for all the packages:

```bash
node scripts/publish-package.mjs @dxos/<a> @dxos/<b> --trust
```

- Tell the user to prefix each with `!` in the Claude Code prompt: it runs in their Terminal tab, where the agent
  follows it with `read_terminal` (tab `0`) and can tell them when an approval is pending.
- Each new package asks for **two** browser approvals: the publish (`Authenticate your account at …`) and the
  trust (~40s later). Press ENTER as each URL appears and approve within ~5 minutes; a lapsed window ends in
  `E404 … /-/v1/done` — re-run.
- Without `--trust` the script prints the settings below and opens each access page for manual entry instead.

| Field           | Value                                        |
| --------------- | -------------------------------------------- |
| Repository      | `dxos/dxos`                                  |
| Workflow file   | `publish-all.yml`                            |
| Environment     | blank                                        |
| Allowed actions | `npm publish` only — not `npm stage publish` |

### 4. Unattended, in the cloud sandbox

Where `op` can read the `CI` vault (`OP_SERVICE_ACCOUNT_TOKEN` set), add `--op`: the run logs in as the
[npm bot account](#npm-bot-account), answers each 2FA prompt with a fresh TOTP code, and revokes the session token on
exit, so the Bash tool runs it with no user step.

### 5. Verify

- In the terminal, every package ends with `Trusted publisher configured: dxos/dxos → publish-all.yml.` Grep the
  scrollback for it (`read_terminal` with a large `lines` saves to a file).
- **The registry lags.** `npm view`, `pnpm check-packages-published` and the script's own `Registry:` check answer
  404 for a new package for a while after its publish. Do not re-run the script without `--dry-run` in that window:
  it would try to publish `0.0.0` again.
- Read each `https://www.npmjs.com/package/@dxos/<name>/access` instead (Claude in Chrome, where the user is signed
  in). A new trusted publisher shows **Status: Pending validation** and a deadline (about two days) by which a
  publish through it must happen. Report that date: the next `publish-all.yml` release (`@latest`, or an `@next`
  dispatch, which is the user's call) validates it.
- `npm trust` grants `stage publish` alongside `publish` (npm 11.15). It is harmless for `publish-all.yml`. Unticking
  it needs the access page's **Edit** dialog, which does not open for agent-driven clicks — leave it, or ask the user to untick it.

### 6. Commit

The script restores `package.json` after the publish, so the only change to commit is the removal of
`"private": true` (plus any `publishConfig` fix). Tick the plan task that asked for the publishers. Add a changeset
only if the PR also changes the package (`agents/instructions/changesets.md`).

## npm bot account

The `npm-bot` npm account's credentials live in 1Password (`CI` vault, item `NPM bot`). Use the references, never
the values (`1password` skill):

| Field             | Reference                           |
| ----------------- | ----------------------------------- |
| Username          | `op://CI/NPM bot/username`          |
| Password          | `op://CI/NPM bot/password`          |
| One-time password | `op://CI/NPM bot/one-time password` |

A TOTP code lasts 30 seconds, so read it fresh for each npm command that asks for one (`--otp "$(op read -n
'op://CI/NPM bot/one-time password?attribute=otp')"`), never once for a loop.

## Many packages

List them all in one `publish-package.mjs` run (step 2), dependencies first. For a backlog of 10+ unrelated packages,
`node scripts/publish-unpublished-packages.mjs` bootstrap-publishes every package that fails the gate, in dependency
order, at `0.0.0`, without trusted publishers; then run `publish-package.mjs --trust` with all their names, or use the
[npm-trusted-publisher](https://github.com/wittjosiah/npm-trusted-publisher) Chrome extension.

## Troubleshooting

| Symptom                                                                   | Cause / fix                                                                                                                                                                                                     |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EOTP` / "requires a one-time password"                                   | Expected on `trust` and some publishes; complete the browser confirmation at the printed URL.                                                                                                                   |
| `trust` reports `permissions: publish, stage publish`                     | npm adds stage publish even when only `--allow-publish` is passed (seen with npm 11.15.0). Harmless for `publish-all.yml`; to match the guide, untick it on the package's access page.                          |
| `npm error Exit handler never called!`, then `npm login did not complete` | The login window lapsed while the URL sat in the build output; run `npm login` on its own first (step 3).                                                                                                       |
| `Registry: not published` for a package just published                    | The registry lags after a bootstrap publish; check the access page instead, and do not re-run without `--dry-run` until `npm view` finds it.                                                                    |
| `Unknown command: "trust"`                                                | npm < 11.15 called directly; the script uses `npx npm@11.15.0` — run it through the script.                                                                                                                     |
| `ERR_PNPM_CANNOT_RESOLVE_WORKSPACE_PROTOCOL`                              | Missing `node_modules`; run `pnpm install`.                                                                                                                                                                     |
| `publish-all.yml` fails with 404/ENEEDAUTH for a package                  | No trusted publisher for it yet; run the script with `--trust`. The `preflight` job (`scripts/check-packages-published.ts`) now catches this before the build, for every package at once.                       |
| `E401 … token is invalid` on one package mid-publish                      | Transient: preflight's OIDC exchange had passed for the same package. Re-run the failed job; `changeset publish` skips versions already on npm, so a re-run resumes the release.                                |
| `E409 … Cannot publish over previously staged version`                    | npm is holding that version in **Validating** (automated review, shown on the package's Versions tab); nobody staged it and nothing needs approving. Wait until it shows Published, then re-run the failed job. |
| Release stops partway (`Some packages failed to publish`)                 | `changeset publish` stops at the first failure, so `latest` is left mixed across versions. Fix the named package, then re-run; tags and the CLI publish run only once every package succeeds.                   |

## Rules

- Never publish a real version by hand, and never run `changeset publish` locally — releases come from
  `publish-all.yml` only.
- Never ask the user for an npm token or password; npm's own browser flow handles auth.
- Never rename `publish-all.yml`: every trusted publisher is bound to that filename.
