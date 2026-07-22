---
name: trunk-quarantine
description: >-
  Use Trunk's CI Autopilot MCP server to investigate a failing CI run,
  find/diagnose a flaky test, and quarantine it. Use when a CI run is red
  and might be flaky, or when asked to quarantine/investigate a specific test.
---

# Trunk flaky-test quarantining

CI already uploads test results to Trunk, which detects flaky tests
statistically and quarantines (auto-skips) them instead of letting them block
merges — no upload setup is needed. The `trunk` MCP server ("CI Autopilot") is
already configured for this repo; each user just needs a one-time
per-user authentication. See [REPOSITORY_GUIDE.md](../../../REPOSITORY_GUIDE.md#trunk-flaky-test-quarantining--ci-autopilot)
for the auth steps if `trunk` tools aren't available yet.

## Investigating a failing CI run

Given a GitHub Actions workflow URL (e.g. from `gh run view` or a PR check),
call `investigate-ci-failure` with that `workflowUrl`. It:

- Pulls Trunk's parsed test-result bundles for that run.
- Filters out tests already quarantined as known-flaky, so you only see real
  failures.
- Tells you if the job failed before tests ran (build/compile failure) — in
  that case fall back to raw CI logs (`gh run view <id> --log-failed`).

Prefer this over reading raw CI logs first when the repo has Trunk uploads
configured — it does the flaky-vs-real triage for you.

## Quarantining a specific flaky test

Do this whenever you've identified a test as flaky (from `investigate-ci-failure`,
a user report, or repeated unrelated CI failures) and want it stopped from
blocking merges.

1. **Find the test case ID**, if you don't already have one:
   call `search-test` with a fuzzy `testNameSearch` and the `repoName`
   (`owner/repo`).
2. **Get evidence it's actually flaky** before quarantining — call
   `fix-flaky-test` with the `testCaseId`:
   - Omit `createNewInvestigation` to fetch the latest existing investigation
     (ID, markdown summary, rendered facts).
   - Pass `createNewInvestigation: true` to enqueue a fresh manual
     investigation if there's no recent one, or if the failure looks
     different from what's on file.
   - If you already have an investigation ID, pass `investigationId` directly
     instead of a test case ID.
3. **Quarantine it.** No MCP tool performs this write — it's a dashboard-only
   action, gated by the repo's Manual Quarantine Permissions (admins-only in
   some repos). So:
   - Check whether the `fix-flaky-test` result includes a direct link to the
     test's Trunk dashboard page — surface it to the user.
   - Tell the user (or, if you have permission and are asked to do it
     yourself via a connected browser, do it) to open the test's details page
     and click **Quarantine → Always**, add a required comment, and **Save**.
     See [REPOSITORY_GUIDE.md](../../../REPOSITORY_GUIDE.md#manually-quarantining-a-test)
     for the exact dashboard steps (details-page and table-row variants, plus
     how to un-quarantine).
   - Never report a test as "quarantined" until the user confirms the
     dashboard action was completed — there's no way to verify or perform the
     write through these tools.

## Notes

- `repoName` is always `owner/repo` (GitHub), not the Trunk org slug.
- `orgSlug` is optional on most tools — only needed to disambiguate when the
  authenticated user belongs to multiple Trunk orgs.
