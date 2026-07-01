# Release Migration — Parked Steps (human-gated / one-way doors)

The Phase 1–3 **code + config** is implemented and verified locally (see [`release-spec.md`](release-spec.md)).
The steps below were deliberately **not** executed by the agent because they are privileged, irreversible,
or require a second repo. Each is gated on a human. Do them in order.

## 1. Repo settings — linear history + merge queue (Phase 1)

GitHub admin. Either the Settings UI (Branches → `main` ruleset) or:

```bash
# Require linear history + PR + merge queue on main (adjust required checks to taste).
gh api -X PUT repos/dxos/dxos/branches/main/protection \
  --input - <<'JSON'
{ "required_status_checks": { "strict": true, "contexts": ["Check"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false }
JSON
# Merge queue is configured via the ruleset UI (Settings → Rules) or the rulesets API.
```

CI already handles `merge_group`, so enabling the queue is safe. Reversible.

## 2. First real release proves the pipeline (Phase 2) — BEFORE any deletion

Overlap, do not gap. release-please stays live until a real Changesets release succeeds.

1. Land a PR with a `.changeset/*.md` (a `patch` — see the pre-1.0 rule).
2. `release.yml` opens the **"Version Packages" PR**. Review it: confirm Group A bumps together, Group B
   together, apps are untouched, `version.ts` + `tauri.conf.json` stamped.
3. **Merge it** → publishes `@latest` (OIDC + provenance). Verify the packages on npm.
4. Confirm `@next` publishes: run the **Release (next)** workflow (`workflow_dispatch`) — it cuts a
   snapshot release (`changeset version --snapshot next` → `changeset publish --tag next --no-git-tag`).
   No `pre` mode, no `.changeset/pre.json`, no branch to establish.

**One-way door:** the first real `@latest` publish. Do not delete the old pipeline until this is green.

## 3. Delete the old pipeline (Phase 2) — only after step 2 is green

The changeset check is **advisory**, wired into **Check** as the `changeset-reminder` job
(`scripts/check-changeset.mjs` posts a sticky comment when a publishable change lacks one; it never
blocks). `validate-pr-title.yaml` and release-please run in parallel during the overlap. Once a real
Changesets `@latest` release has landed (step 2), delete the old pipeline in one PR:

- Remove from `tools/toolbox/src/main.ts` the `updateReleasePlease()` call (keep `updateChangesets()`),
  then delete the `updateReleasePlease` method and `release-please-config.json` / `.release-please-manifest.json`.
- Delete `release-please.yml`, `release-candidate.yml`, `validate-pr-title.yaml`, the npm path of
  `publish-all.yml`, `.github/workflows/scripts/bump-version.js`, `.github/workflows/scripts/publish.sh`,
  and the `{x-release-please-version}` markers in the `version.ts` files.
- Promote `agents/instructions/changesets.md` into the core `CLAUDE.md`.
- Keep `pkg-pr-new.yml`, `preview.yml`, `preview-deploy.yml`.

## 4. Retire long-lived branches (Phase 2) — last

Back up tips first (`git tag backup/<branch> origin/<branch>` and push the tags), then delete
`production` / `staging` / `labs` / `dev`. **One-way door.**

**Tauri trigger — already migrated (not a blocker):** `publish-tauri.yaml` is now a reusable
`workflow_call` invoked from `deploy-apps.yml` per environment (CrabNebula channel derived from the
`environment` input; version from `composer-app`'s `package.json`); it has **no branch triggers**. So
retiring `labs`/`staging`/`production` costs nothing here. **Needs a real CI run to validate** (signing /
CrabNebula paths can't be exercised locally).

## 5. Phase 3 proof against the `edge` repo

The cross-repo tooling is written but can only be exercised with `edge` checked out:

- Wire `scripts/check-cross-repo-cycles.mjs` into `edge-tests.yml` (reuse its dxos+edge dual-checkout):
  `node scripts/check-cross-repo-cycles.mjs "$DXOS_ROOT" "$EDGE_ROOT"`. Add as a required check + a scheduled job.
- Pilot `scripts/check-no-local-overrides.mjs` in `edge` CI.
- Generalize `edge/scripts/link-packages.mjs` into this repo's `scripts/` (Tier 3); point `edge-tests.yml`
  at the dxos-owned copy; forbid its `--commit` path.
- Add the Tier-2 pkg.pr.new bump bot and the layer-direction lint (cheap defense-in-depth).

## 6. Deploy environments setup (Cloudflare)

The four-environment deploy flow (`deploy-apps.yml`, `deploy-manifest.json`, `scripts/deploy-env.sh`) is
implemented on **Cloudflare Workers Static Assets** but needs platform configuration the agent can't do.
No GitHub Environments are used — "what's deployed where" is tracked by the floating `<app>/<env>` git
tags, and human gating is the deliberate release dispatch.

`deploy-env.sh` runs `wrangler deploy` against a generated `wrangler.deploy.json` per app, using one Worker
per environment: `production` → the bare `worker` name from the manifest (e.g. `composer`), every other env
→ `<worker>-<env>` (e.g. `composer-labs`). The API token (`CLOUDFLARE_API_TOKEN`) needs **Workers Scripts:
Edit** on the account (Pages-only tokens won't deploy Workers).

1. **Create the Workers + attach custom domains** — for each manifest app, the first `wrangler deploy`
   auto-creates the Worker; then attach the real custom domain to the **production** Worker (e.g.
   `composer.dxos.org` → `composer`) and any preview domains to the `-<env>` Workers. Deploy the Workers
   **before** moving domains off the Pages projects so there's no gap (Pages and Workers can serve in
   parallel during the switchover). Retire the Pages projects only once the domains have moved.
2. **Migrate `docs` off Cloudflare-native deploy** — docs currently builds/deploys via Cloudflare's git
   integration, not GitHub Actions. To bring it into this flow: disable the Cloudflare auto-build for docs,
   and rely on `deploy-apps.yml` (docs is in the manifest, `docs:bundle` → `docs/dist`,
   `notFoundHandling: 404-page`). Verify the first GH-Actions docs deploy before disabling the native one.
3. **Follow-up migrations (still on Pages):** `preview-deploy.yml` posts per-PR previews via Pages
   branch-alias URLs (`pr-<n>.composer-app.pages.dev`) — migrating to Workers means preview URLs (versions)
   or per-PR named Workers, a distinct URL contract (the sticky `composer-preview` comment references it).
   The legacy `publish-all.yml` + `deploy-apps.sh` still `wrangler pages deploy`, but are slated for
   deletion (§ the retire-legacy-workflows step) — migrate only if their deletion slips.

## Remaining smaller wiring (not blocking, no human gate)

- `check-changeset` is wired into **Check** as the advisory `changeset-reminder` job. Still to add: `sync-versions --check` as a Check step.
- Wire `check-cross-repo-cycles.mjs` once `edge` is the second repo.
