<!--
  Copyright 2026 DXOS.org
-->

# Boot budget timeline

The `composer-app:check-boot-budget` guardrail (`scripts/check-boot-budget.mjs`) prints one line
per CI run — preload entry count and total on-disk bytes of the eager boot graph. This is that
line, extracted from every `Check` workflow run on `main`, so a regression can be attributed to
the commit that introduced it rather than to the run that happened to trip the ceiling.

Coverage starts at 461ce1e1 (2026-08-23), when the check first ran in CI; earlier rows come from
the same step while it still lived in the `check` job, before #12730 split it onto its own runner.
Budget throughout: 25 entries / 4.25 MB.

## Where the 4.25 MB went

Growth is not gradual — four commits account for +0.24 MB of the +0.25 MB drift, and the budget
had ~0.24 MB of headroom when the window opens:

| Δ MB | Commit | Change |
| --- | --- | --- |
| 4.01 → 4.04 | `4560ba3a` | observability: OTel metrics for spaces, sync, EDGE reconnects, memory and runtime lag (#12702) |
| 4.05 → 4.15 | `22bea85f` | config: convert dxos.config to buf (#12733) |
| 4.16 → 4.18 | `b02fe163` | graph: rebuild @dxos/graph on Effect's Graph module (#12594) — also 21 → 22 entries |
| 4.18 → 4.24 | `48eb05d6` | protocols: route protoMessage through buf; fix Struct double-encoding (#12748) |

The two buf commits are the bulk of it (+0.16 MB combined): the buf runtime is reached from the
boot graph where protobufjs was not. `9817b6f2` then landed exactly on 4.25 MB, and `e954c0ff`
(protocols: resolve `google.protobuf.Any` in shape-compat) is the first run to fail; every run
since is red.

Top boot chunks in the failing runs — `react` at 754 KB plus twelve `boot-*` partition buckets,
the largest three at 548 / 534 / 466 KB.

## Per-commit results

| Date (UTC) | Commit | Entries | MB | Result | Title |
| --- | --- | --- | --- | --- | --- |
| 2026-08-22T15:36:21Z | `77a2d34c` | 21 | 4.00 | pass | plugin-space: one generic object-form dialog, returning what it created (#12708) |
| 2026-08-22T18:23:45Z | `5180720d` | 21 | 4.00 | pass | compute: evict a failed lazy operation handler load so retries re-import (#12709) |
| 2026-08-23T03:03:49Z | `0a3e9ddd` | 21 | 4.00 | pass | react-ui, react-ui-components: one progress readout, assembled from a bar, a stepper and a crawl (#12716) |
| 2026-08-23T05:49:16Z | `5bb340f5` | 21 | 4.00 | pass | plugin-inbox, plugin-script: parse every legal From header, not just one shape (#12718) |
| 2026-08-23T05:59:01Z | `461ce1e1` | 21 | 4.01 | pass | worker-framework: bound leader-lock steals so a wedged tab cannot restart every worker (#12707) |
| 2026-08-23T06:47:25Z | `96281430` | 21 | 4.01 | pass | skills: add user-submissions triage skill (#12711) |
| 2026-08-23T08:26:23Z | `32468c31` | 21 | 4.01 | pass | plugin-lingo: a reading companion for language learners (#12712) |
| 2026-08-23T09:12:27Z | `49aee6cb` | 21 | 4.01 | pass | assistant: let completeJob accept null and never lose a completed job (#12721) |
| 2026-08-23T09:39:57Z | `1e2a300b` | 21 | 4.01 | pass | plugin-google, plugin-jmap: lower the mail sync per-run budget to fit the smallest host (#12720) |
| 2026-08-23T19:09:38Z | `0a7dcd56` | 21 | 4.01 | pass | moon: upgrade to 2.5.2 and share one build cache across worktrees (#12724) |
| 2026-08-23T23:14:06Z | `4718992e` | 21 | 4.01 | pass | plugin-file-system: rename plugin-native-filesystem to plugin-file-system (#12723) |
| 2026-08-23T23:57:39Z | `7d000b91` | 21 | 4.01 | pass | echo: normalize Chat ownership onto the parent edge (Filter.hasParent, remove CompanionTo) (#12675) |
| 2026-08-24T00:39:47Z | `78523d2f` | 21 | 4.01 | pass | assistant: derive model-facing tool names from operation keys (#12677) |
| 2026-08-24T01:01:23Z | `318bbad8` | 21 | 4.01 | pass | plugin-client: order first-run schema registration ahead of its consumers (#12722) |
| 2026-08-24T02:34:07Z | `86d14822` | 21 | 4.01 | pass | deus: add a QA flow dialect for human and agent testers (#12713) |
| 2026-08-24T11:36:29Z | `ca34a80a` | 21 | 4.01 | pass | echo: add Migration.defineRename for renamed named entities (#12725) |
| 2026-08-24T12:29:50Z | `4560ba3a` | 21 | 4.04 | pass | observability: OTel metrics for spaces, sync, EDGE reconnects, memory and runtime lag (#12702) |
| 2026-08-24T14:17:15Z | `40ecd440` | 21 | 4.04 | pass | assistant, plugin-ibkr: report the real cause of two swallowed failures (#12729) |
| 2026-08-24T14:45:10Z | `5305365b` | 21 | 4.04 | pass | app-framework: run plugin body imports concurrently (#12656) |
| 2026-08-24T16:15:17Z | `bdb02cd3` | 21 | 4.04 | pass | protocols: audit protobuf.js usage and start the buf migration (#12727) |
| 2026-08-24T16:51:50Z | `4802d68c` | 21 | 4.04 | pass | ci: split boot budget into its own job and shard the vitest jobs (#12730) |
| 2026-08-24T23:05:12Z | `e8088eaf` | 21 | 4.05 | pass | util: fix downloads and feedback log uploads in the native app (#12715) |
| 2026-08-25T02:41:22Z | `cd4da46d` | 21 | 4.05 | pass | magazine, outliner, projects: fix curation and outline defects found driving the live app (#12737) |
| 2026-08-25T03:57:57Z | `9f7ff6c7` | 21 | 4.05 | pass | app-framework, ui-editor: follow-up review fixes from #12737 (#12738) |
| 2026-08-25T13:38:13Z | `b8762efc` | 21 | 4.05 | pass | assistant: bind chat context through a contributed capability (#12735) |
| 2026-08-25T14:18:42Z | `f4c27025` | 21 | 4.05 | pass | plugin-routine, compute: make routine ownership explicit, drop the routines companion (#12736) |
| 2026-08-25T14:43:18Z | `ba052982` | 21 | 4.05 | pass | ci: size the moon cache from RAM, and fix the bench harness that hid it (#12744) |
| 2026-08-25T15:04:34Z | `ffbd4dc6` | 21 | 4.05 | pass | plugin-claude-agents: add plugin for Claude managed agents (#12741) |
| 2026-08-25T15:38:04Z | `5e8878c5` | 21 | 4.05 | pass | echo: release feed objects once nothing holds them, and measure what stays resident (#12745) |
| 2026-08-25T18:28:42Z | `22bea85f` | 21 | 4.15 | pass | config: convert dxos.config to buf (#12733) |
| 2026-08-25T19:20:32Z | `3e022015` | 21 | 4.15 | pass | config, ci: point dev-tier clients at EDGE preview; retire the labs introspect defaults (DX-1150) (#12747) |
| 2026-08-25T21:56:51Z | `f2b75fa3` | 21 | 4.16 | pass | plugin-lametric: show a space on a LaMetric TIME over a shared space-dashboard capability (#12749) |
| 2026-08-25T22:23:27Z | `0e228914` | 21 | 4.16 | pass | plugins, types: replace the deprecated getSpace where only a database is needed (#12746) |
| 2026-08-25T22:44:22Z | `6d28380f` | 21 | 4.16 | pass | plugin-deck: mobile support (navigation stack), retire plugin-simple-layout (#12676) |
| 2026-08-25T23:31:32Z | `84568a0c` | 21 | 4.16 | pass | plugin-google: drop gmail.readonly and pin OAuth scope sets (DX-794) (#12740) |
| 2026-08-26T01:27:05Z | `9684ee84` | 21 | 4.16 | pass | projects: one project skill (#12704) |
| 2026-08-26T02:53:46Z | `1ab4bb8c` | 21 | 4.16 | pass | plugins: single canonical plugin definitions with generated headless capability barrels (#12610) |
| 2026-08-26T03:25:19Z | `b02fe163` | 22 | 4.18 | pass | graph: rebuild @dxos/graph on Effect's Graph module (#12594) |
| 2026-08-26T06:59:00Z | `51c7e912` | 22 | 4.18 | pass | assistant-toolkit: fix live sub-agent delegation; Chat.taskSet replaces the markdown checklist (#12752) |
| 2026-08-26T09:12:54Z | `48eb05d6` | 22 | 4.24 | pass | protocols: route protoMessage through buf; fix Struct double-encoding (#12748) |
| 2026-08-26T09:35:37Z | `3d4a4da1` | 22 | 4.24 | pass | echo: log subduction sync decisions and non-converging collection sync (#12742) |
| 2026-08-26T09:56:23Z | `9817b6f2` | 22 | 4.25 | pass | echo: release automerge objects and their documents once nothing holds them (#12750) |
| 2026-08-26T11:24:24Z | `f8bfba0f` | 22 | 4.25 | pass | echo: credentials in an automerge document, behind DX_AUTOMERGE_CREDENTIALS (#12726) |
| 2026-08-26T11:49:04Z | `8db69c61` | 22 | 4.25 | pass | fix(react-ui-assistant): build the translations entry the manifest declares (#12756) |
| 2026-08-26T12:30:23Z | `e954c0ff` | 22 | 4.25 | **FAIL** | protocols: resolve google.protobuf.Any in shape-compat; move the metadata stores to buf (#12753) |
| 2026-08-26T12:34:19Z | `5755a428` | 22 | 4.25 | **FAIL** | ci: validate docs links on PRs (#12754) |
| 2026-08-26T13:10:40Z | `dde67142` | 22 | 4.25 | **FAIL** | edge-client: floor connection uptime to whole seconds (#12760) |
| 2026-08-26T13:15:26Z | `5f6808cc` | 22 | 4.25 | **FAIL** | ci: partial-clone every full-depth checkout and drop the no-op LFS fetch (#12757) |
