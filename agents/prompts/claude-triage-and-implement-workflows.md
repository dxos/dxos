# Claude Code: triage + implement loop for Composer feedback issues

Two GitHub Actions workflows that close the loop from "user files an issue via the Composer feedback form" to "Claude opens a draft PR addressing it."

- **`claude-composer-triage.yml`** — runs on every new `Composer`-labeled issue. Cheap. Reads the issue, decides if it's actionable, and either gates it for implementation or asks for more info.
- **`claude-composer-implement.yml`** — runs only when the triage agent (or a human) adds the `needs-implementation` label. Expensive. Opens a draft PR.

Drop both into `.github/workflows/` in `dxos/dxos`.

## Prerequisites

1. Run `claude /install-github-app` once on `dxos/dxos` to install the Claude GitHub App + `ANTHROPIC_API_KEY` secret.
2. Provision labels on the repo (idempotent):
   - `Composer` — already needed by the feedback form.
   - `needs-implementation` — set by triage to gate phase 2.
   - `needs-info` — set by triage when the report is incomplete.
   - `claude-implementing` — set by phase 2 to prevent concurrent reentry.

   ```bash
   # --force makes `gh label create` an upsert; safe to re-run.
   gh label create needs-implementation --color "0052CC" --description "Triaged as actionable; awaiting implementation" --repo dxos/dxos --force
   gh label create needs-info          --color "FBCA04" --description "Triaged: more info needed from reporter"          --repo dxos/dxos --force
   gh label create claude-implementing --color "5319E7" --description "Claude is working on this; do not double-trigger" --repo dxos/dxos --force
   ```

## `.github/workflows/claude-composer-triage.yml`

```yaml
name: Claude triage (Composer feedback)

on:
  issues:
    types: [opened, labeled]

permissions:
  contents: read
  issues: write
  pull-requests: read

concurrency:
  # One triage per issue at a time; cancel a re-trigger if the label edit fires again.
  group: claude-triage-${{ github.event.issue.number }}
  cancel-in-progress: true

jobs:
  triage:
    # Only run on Composer-labeled issues — never on every issue.
    # Avoid retriggering on labels we add ourselves.
    if: >
      contains(github.event.issue.labels.*.name, 'Composer') &&
      !contains(github.event.issue.labels.*.name, 'needs-implementation') &&
      !contains(github.event.issue.labels.*.name, 'needs-info') &&
      !contains(github.event.issue.labels.*.name, 'claude-implementing') &&
      github.event.sender.type != 'Bot'
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          claude_args: '--max-turns 3'
          prompt: |
            You are triaging a GitHub issue filed from the Composer in-app
            feedback form. The body contains a markdown trailer with the
            user-reported type, severity, area (plugin id), and app version.
            It may include a screenshot.

            Decide whether the issue is ACTIONABLE.

            An issue is actionable when at least ONE of:
              - It identifies a clear bug with enough detail to reproduce
                (steps, expected vs actual, screenshot).
              - It describes a self-contained feature request that could
                fit in a single PR (under ~500 LOC, no architectural debate).

            An issue is NOT actionable when:
              - The body is empty, vague, or asks a question rather than
                reporting a defect.
              - It requires architectural decisions, design discussion,
                or trade-off choices that need a human.
              - The reported behaviour is intentional / a duplicate of an
                existing issue (search the repo first).
              - It crosses multiple plugins or requires changes to core
                framework packages — flag for human review.

            ## Output

            Post ONE comment in this exact format:

              **Triage verdict:** ACTIONABLE | NEEDS-INFO | NOT-ACTIONABLE
              **Reasoning:** <1-3 sentences>
              **Suggested approach:** <only if ACTIONABLE; brief plan>
              **Missing info:** <only if NEEDS-INFO; bullet list>

            Then take ONE of these label actions:
              - If ACTIONABLE → add the label `needs-implementation`.
              - If NEEDS-INFO → add the label `needs-info`.
              - If NOT-ACTIONABLE → close the issue with a polite reason.

            DO NOT:
              - Open a PR. The implementation phase runs separately.
              - Modify the issue body or title.
              - Add labels other than the three above.
              - Mark anything ACTIONABLE if you have any doubt — leaning
                conservative is fine. Human reviewers can override by
                adding `needs-implementation` manually.
```

## `.github/workflows/claude-composer-implement.yml`

```yaml
name: Claude implement (Composer feedback)

on:
  issues:
    types: [labeled]

permissions:
  contents: write
  issues: write
  pull-requests: write

concurrency:
  # One implementation across the whole repo at a time — keeps token spend
  # predictable and avoids two Claude PRs touching the same files.
  group: claude-implement-global
  cancel-in-progress: false

jobs:
  implement:
    if: >
      github.event.label.name == 'needs-implementation' &&
      contains(github.event.issue.labels.*.name, 'Composer') &&
      !contains(github.event.issue.labels.*.name, 'claude-implementing')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          # Need full history so Claude can create a branch off main.
          fetch-depth: 0

      # Mark the issue so re-labeling doesn't re-enter.
      - name: Mark in-progress
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              labels: ['claude-implementing'],
            });

      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          claude_args: '--max-turns 15'
          prompt: |
            This issue has been triaged as actionable. Implement a fix or
            feature in a DRAFT pull request.

            ## Steps

            1. Read the issue body. Note the type/severity/area trailer and
               (if present) the screenshot. The `area/<plugin-id>` label
               tells you which package is most relevant — start there.
            2. Read `CLAUDE.md` and the relevant package's `PLUGIN.mdl`
               (if any) for conventions.
            3. Reproduce the issue if it's a bug — write a failing test
               first, then implement the fix.
            4. For features, write the implementation plus a test or
               storybook story exercising the new surface.
            5. Run `moon run <package>:build` and `moon run <package>:lint
               -- --fix` on every package you touch. The PR must build
               clean before you open it.
            6. Open a DRAFT pull request titled
               `feat(<package>): <short summary>` or `fix(<package>): …`.
               Body must reference the issue (`closes #<number>` or
               `part of #<number>`).
            7. Comment on the original issue with a link to the PR.

            ## Guardrails

            - Stop and post a comment if any of the following:
              - The change would touch more than 3 packages.
              - The change requires a breaking API change.
              - You can't reproduce a reported bug after reasonable effort
                (use the screenshot, version, and area hints).
              - Tests fail in a way you can't immediately fix.
            - Open the PR as DRAFT. A human will mark it ready for review.
            - NEVER push to `main` directly.
            - NEVER merge anything.
            - Keep the PR description focused on what + why; let the test
              plan describe how to verify.

      # If Claude exited without opening a PR (e.g. ran out of turns or
      # hit a guardrail), clear the implementing label so a human can
      # retry by re-adding `needs-implementation`.
      - name: Clear in-progress label
        if: always()
        uses: actions/github-script@v7
        with:
          script: |
            try {
              await github.rest.issues.removeLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                name: 'claude-implementing',
              });
            } catch (err) {
              // Label may have been removed already; non-fatal.
              core.info('claude-implementing label already absent');
            }
```

## Gotchas

- **Anti-loop on PR-from-Claude:** the Claude GitHub App is a distinct actor; the `issues:` triggers won't fire on PRs. But if Claude comments on the issue in a way that _adds_ a label, the workflow could re-enter. The `!contains(... 'claude-implementing')` guard prevents that.
- **Cost ceiling:** triage at `--max-turns 3` is roughly 1-5¢ per call; implementation at `--max-turns 15` is more like $0.10-$1 depending on patch size. With many users filing issues, set up Anthropic budget alerts — there's no built-in monthly cap.
- **Non-write-access reporters:** the `claude-code-action` defaults to running only for users with write access on the repo. Since the feedback form will be filing issues as the GitHub App (or as anonymous users via the prefilled URL), you may need to add `allowed-actors` config or accept that triage only fires when a maintainer adds the `Composer` label. Verify with a real form submission.
- **Stale PRs:** Claude may open a draft PR and then never touch it again. Add a separate scheduled workflow (out of scope here) that closes draft Claude PRs older than N days.
- **Conflicting concurrent edits:** the implementation workflow has `concurrency: claude-implement-global` so only one runs at a time. Tune that — `cancel-in-progress: false` waits in queue; flip to `true` if you'd rather supersede.

## Roll-out suggestion

1. Land the workflows behind a tag selector (`if: contains(... 'claude-pilot')`) so you can test on a handful of opted-in issues first.
2. Watch the first ~10 triage decisions; tune the prompt's "actionable" definition based on real misses.
3. Once triage is calibrated, flip to the `Composer` label gate.
4. Implementation phase stays disabled (commented out) until triage feels solid.

## Out of scope

- Setting Projects custom fields (e.g. "Priority") from the workflow — needs a separate `gh` API call; not necessary for v1.
- Multiple-agent parallel implementation (one per issue) — possible but expensive.
- Closing the loop visually inside Composer (showing "Claude is working on your issue" status) — would need polling a public endpoint on the Composer side; skip for v1.
