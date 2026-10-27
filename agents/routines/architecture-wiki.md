# Routine: architecture wiki — regenerate the DXOS wiki from the specs

A Claude Code cloud Routine (or a one-off session) that keeps the **DXOS Architecture** space template's wiki in
step with the repository's specs. The feature map (`FEATURES.mdl`) is the wiki's spine: each `### <area>` is a
section, and every spec a feature cites — plus every `PLUGIN.mdl` and `SPEC.mdl`, cited or not — is one page. A space
created from the template holds the result (content spec:
`packages/plugins/plugin-canvas/src/samples/architecture/wiki/CONTENT.md`).

The conversion is mechanical, so the routine is mostly a script run; the judgement is in reading the report:

| Output of the script                   | What the run does                                                           |
| -------------------------------------- | --------------------------------------------------------------------------- |
| `wiki.json` unchanged                  | nothing; reply "wiki current" and stop without a PR                         |
| `wiki.json` changed                    | run the tests, commit, open one PR                                          |
| `Cited by FEATURES.mdl but not found:` | list the paths in the PR body; a feature cites a spec that moved or is gone |

Why a committed `wiki.json` and not a build step: a space template must build in the browser, where there is no
repository to read, and a test that compared the file against live specs would fail every PR that touches any spec.

## Trigger configuration

- **Environment:** the repository's cloud environment (setup command `bash .config/claude-code-setup.sh`). The
  generator needs only `node` (22.18 or later, for type stripping); the tests need the package's `node_modules`.
- **Schedule:** weekly, `17 6 * * 1` UTC, fresh session per fire; also fired by hand after a large spec change.
- **Prompt:** the block below, verbatim.
- **Outcome:** one PR per run, `plugin-canvas: regenerate the DXOS wiki`; nothing is pushed to `main`.

---

```text
Regenerate the DXOS wiki from the repository's specs. Work autonomously — do not ask questions; record any judgement
in the PR body.

You are in the Claude Code cloud sandbox: read `.agents/skills/cloud-sandbox/SKILL.md` first, then
`packages/plugins/plugin-canvas/src/samples/architecture/wiki/CONTENT.md`.

1. `git fetch origin main` and start from `origin/main`.
2. Run `node packages/plugins/plugin-canvas/src/samples/architecture/wiki/generate-wiki.ts`. It prints the area and
   page counts and any spec FEATURES.mdl cites that does not exist.
3. `git diff --stat -- packages/plugins/plugin-canvas/src/samples/architecture/wiki/wiki.json`. No change → reply
   "wiki current" and stop.
4. If the area or page counts changed, update the counts paragraph under `## Contents` in `CONTENT.md` (the date is
   today's, the counts are the script's).
5. Run `moon run plugin-canvas:test -- src/samples/architecture` (the wiki tests and `ArchitectureSpace.test.ts`).
   A failure in `generate.test.ts`'s committed-file check means a spec uses markdown the generator does not handle:
   fix `generate.ts` (and add a case to `generate.test.ts`), never the spec and never `wiki.json` by hand.
6. `pnpm format`, then commit `wiki.json` (and `CONTENT.md`, `generate.ts`, `generate.test.ts` if changed) as
   `plugin-canvas: regenerate the DXOS wiki` and open one PR with the `submit-pr` skill. The body lists pages added
   and removed (by spec path), the missing citations from step 2, and any generator fix.
```
