<!--
  Copyright 2026 DXOS.org
-->

# Boot budget timeline

The `composer-app:check-boot-budget` guardrail (`scripts/check-boot-budget.mjs`) prints one line
per CI run — preload entry count and total on-disk bytes of the eager boot graph. This is that
line, extracted from every `Check` run on `main`, so a regression can be attributed to the commit
that introduced it rather than to the run that happened to trip the ceiling.

Coverage is the check's entire CI life: 213 commits, 2026-08-06 (`0280a6a0`, where the script and
its first wiring landed) through 2026-08-26. The step moved jobs twice — `e2e` until `987f7e1c`,
then `check`, then its own `boot-budget` runner from `4802d68c` (#12730) — so the rows are joined
by log content, not by job name.

The budget was re-baselined once, at `987f7e1c`: 30 entries / 6.00 MB down to 25 / 4.25 MB.
Rows are flagged `OVER` by the job's own verdict where the check owns its runner, and by
`MB > budget` before that (the shared `e2e` / `check` jobs fail for unrelated reasons too, so
their conclusion is not a budget signal). MB values are the script's two-decimal display over a
raw byte comparison, so at the ceiling the status column is authoritative and the number is not.

## The shape of it

Two eras, and the second one has eaten its entire margin:

| Date          | Commit     | Δ                     | What                                                                          |
| ------------- | ---------- | --------------------- | ----------------------------------------------------------------------------- |
| 08-06         | `0280a6a0` | 5.41 MB (budget 6.00) | check introduced (#12415)                                                     |
| 08-06 → 08-12 | —          | 5.38 → 5.47           | slow drift, ~0.5 MB of headroom throughout                                    |
| 08-12         | `a3b6ef05` | 5.47 → **4.97**       | Effect 3 → 4 migration (#12521)                                               |
| 08-13         | `987f7e1c` | 4.97 → **4.05**       | XPlugin namespace entrypoints (#12550); budget re-baselined to 4.25           |
| 08-13 → 08-23 | —          | 4.00 → 4.01           | flat for ten days                                                             |
| 08-24         | `4560ba3a` | 4.01 → 4.04           | observability: OTel metrics (#12702)                                          |
| 08-25         | `22bea85f` | 4.05 → **4.15**       | config: convert dxos.config to buf (#12733)                                   |
| 08-26         | `b02fe163` | 4.16 → 4.18           | graph on Effect's Graph module (#12594); 21 → 22 entries                      |
| 08-26         | `48eb05d6` | 4.18 → **4.24**       | protocols: route protoMessage through buf (#12748)                            |
| 08-26         | `9817b6f2` | 4.24 → 4.25           | first run to display 4.25 MB while still under the raw byte ceiling (#12750)  |
| 08-26         | `e954c0ff` | **OVER**              | protocols: `google.protobuf.Any` in shape-compat (#12753) — first failing run |

Everything since `e954c0ff` is red. The 4.25 MB ceiling was set at `987f7e1c` with ~0.2 MB of
margin over a 4.05 MB graph; four commits spent it, and the two buf conversions are +0.16 MB of
the +0.25 MB total — the buf runtime is boot-reachable where protobuf.js was not.

Top boot chunks in the failing runs: `react` at 754 KB, then twelve `boot-*` partition buckets,
the largest three at 548 / 534 / 466 KB.

## Reproducing this table

The lines come from the GitHub Actions job logs, which age out (~90 days). To refresh or extend:
list `check.yml` runs on `main`, and for each run grep its jobs' logs for `boot graph:`.

## Per-commit results

| Date (UTC)           | Commit     | Entries | MB   | Budget | Status   | Title                                                                                                                           |
| -------------------- | ---------- | ------- | ---- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-06T01:16:15Z | `0280a6a0` | 24      | 5.41 | 6.00   | ok       | composer-app: startup-latency (demand-driven activation, per-plugin start events, streaming start, suspenseful client) (#12415) |
| 2026-08-06T01:29:57Z | `bc4c2097` | 24      | 5.41 | 6.00   | ok       | ci: partial-clone the checkouts in Check and drop the no-op LFS fetch (#12485)                                                  |
| 2026-08-06T08:59:13Z | `d865df12` | 24      | 5.40 | 6.00   | ok       | feat: point client configs at dxos.network edge domains (#12476)                                                                |
| 2026-08-06T10:02:13Z | `4353801e` | 24      | 5.40 | 6.00   | ok       | model-fixture: own vitest tag, non-required workflow, rename + hash-addressed store (phases 1–4) (#12475)                       |
| 2026-08-06T10:44:06Z | `34e4fb75` | 24      | 5.40 | 6.00   | ok       | feed: add optional at-rest encryption via pluggable Cypher (#12490)                                                             |
| 2026-08-06T13:11:19Z | `9e7058aa` | 24      | 5.40 | 6.00   | ok       | model-fixture: enable id sanitization by default + invariance fuzz (#12493)                                                     |
| 2026-08-06T15:03:30Z | `2c5aaf00` | 24      | 5.40 | 6.00   | ok       | composer-app: derive serve-min deps and importSource excludes from package metadata (#12369)                                    |
| 2026-08-07T21:39:03Z | `b0b1f40a` | 23      | 5.38 | 6.00   | ok       | cli: restore the @opentui platform packages the bundle cross-compiles against (#12508)                                          |
| 2026-08-07T23:44:14Z | `59e5c6cc` | 23      | 5.38 | 6.00   | ok       | ci: queue pkg.pr.new publishes instead of cancelling them (#12509)                                                              |
| 2026-08-08T14:20:05Z | `da37a13e` | 23      | 5.38 | 6.00   | ok       | space, storybook: create the default space before the settings space; fix the red storybook suites (#12510)                     |
| 2026-08-08T17:23:19Z | `0a182f77` | 23      | 5.38 | 6.00   | ok       | search, assistant, tasks: fix the three storybook suites red on main (#12512)                                                   |
| 2026-08-08T18:28:35Z | `3958355f` | 23      | 5.38 | 6.00   | ok       | cli: restore the CLI publish, and import dx.config.ts directly (#12513)                                                         |
| 2026-08-08T21:39:30Z | `ba08e650` | 23      | 5.38 | 6.00   | ok       | app-framework: evaluate dx.config.ts in a node subprocess (#12514)                                                              |
| 2026-08-08T22:42:31Z | `fc83abdf` | 23      | 5.39 | 6.00   | ok       | react-ui: overlay the ScrollArea scrollbar thumb on content (#12516)                                                            |
| 2026-08-08T23:05:37Z | `1b627267` | 23      | 5.39 | 6.00   | ok       | ui-editor: keep the scrollbar thumb inset on hover (#12517)                                                                     |
| 2026-08-09T02:10:42Z | `ea11703a` | 23      | 5.39 | 6.00   | ok       | client, app-framework: add an agent debug port for driving the live app (#12519)                                                |
| 2026-08-09T04:07:29Z | `b217ecc6` | 23      | 5.39 | 6.00   | ok       | skills: resolve operation definitions through the introspect MCP server (#12520)                                                |
| 2026-08-09T09:30:02Z | `f1c67714` | 23      | 5.39 | 6.00   | ok       | test: env-gated CPU-profile & leak-detect instrumentation for vitest suites (#12523)                                            |
| 2026-08-09T10:10:50Z | `881f9001` | 24      | 5.45 | 6.00   | ok       | plugin-inbox: extract the Google and JMAP providers into headless plugins (#12518)                                              |
| 2026-08-09T11:00:49Z | `2eee6a7b` | 24      | 5.45 | 6.00   | ok       | test: Phase 4 leak/hotspot sweep results (no findings) (#12527)                                                                 |
| 2026-08-09T13:44:32Z | `d7b0a3b0` | 24      | 5.45 | 6.00   | ok       | edge-client: authenticate registry uploads with DX_HUB_API_KEY (#12528)                                                         |
| 2026-08-10T02:06:48Z | `77d00260` | 25      | 5.45 | 6.00   | ok       | plugin-space: add RemoveAllObjects operation (#12500)                                                                           |
| 2026-08-10T04:07:06Z | `85ad256f` | 25      | 5.45 | 6.00   | ok       | plugin-client: issue and redeem invitation codes from the CLI (#12530)                                                          |
| 2026-08-10T04:10:53Z | `c56ba349` | 25      | 5.45 | 6.00   | ok       | plugin-client: await client initialization in the CLI (#12531)                                                                  |
| 2026-08-10T04:33:25Z | `cc453816` | 25      | 5.45 | 6.00   | ok       | plugin-client: pin WebAuthn relying party to composer.space (#12532)                                                            |
| 2026-08-10T16:36:09Z | `9e917622` | 25      | 5.45 | 6.00   | ok       | plugin-client: label, distinguish, and revoke recovery credentials (#12533)                                                     |
| 2026-08-10T17:43:07Z | `fee7666b` | 25      | 5.45 | 6.00   | ok       | plugin-client: rename storage reset to logout and gate identity-recovery resets (#12536)                                        |
| 2026-08-10T22:20:34Z | `129dddf4` | 25      | 5.45 | 6.00   | ok       | ci: stop rust-cache clobbering the tauri build's cargo (#12539)                                                                 |
| 2026-08-11T10:37:28Z | `18597fcd` | 25      | 5.46 | 6.00   | ok       | echo: add per-space storage metrics and garbage collection (#12529)                                                             |
| 2026-08-11T11:34:09Z | `b9d72bbc` | 25      | 5.46 | 6.00   | ok       | echo: close GC correctness gaps, reclaim on every peer, and surface what a space occupies (#12535)                              |
| 2026-08-11T11:39:05Z | `fa6eea9d` | 25      | 5.46 | 6.00   | ok       | composer-app: fold serve-min into serve, and stop enabling labs plugins in dev (#12495)                                         |
| 2026-08-11T12:26:14Z | `cafa2404` | 25      | 5.46 | 6.00   | ok       | plugin-space: fix duplicate settings space created during onboarding (#12540)                                                   |
| 2026-08-11T14:00:47Z | `2d4107f9` | 25      | 5.46 | 6.00   | ok       | plugin-client: add account signup command (#12378)                                                                              |
| 2026-08-11T16:37:25Z | `c2641e01` | 25      | 5.46 | 6.00   | ok       | release: upgrade to Changesets v3 and drop the obsolete release-plan patch (#12542)                                             |
| 2026-08-11T19:50:48Z | `659f554b` | 25      | 5.46 | 6.00   | ok       | e2e: bundle once, then shard by browser x moon --job (#12482)                                                                   |
| 2026-08-11T22:32:06Z | `643e085f` | 25      | 5.46 | 6.00   | ok       | ci: order the check job into cost-ranked stages, move the boot budget into it (#12545)                                          |
| 2026-08-12T07:06:01Z | `23d2d8c4` | 25      | 5.46 | 6.00   | ok       | edge-client: fetch the auth nonce from /auth instead of provoking a 401 (#12541)                                                |
| 2026-08-12T07:32:19Z | `fa36e263` | 25      | 5.47 | 6.00   | ok       | plugin-inbox: cursored ProcessMailbox pipeline with toolbar start/stop, progress, and reset (#12538)                            |
| 2026-08-12T11:09:30Z | `9e449df6` | 25      | 5.47 | 6.00   | ok       | plugin-navtree: stop the L0 rail insetting items by the scrollbar strip (#12544)                                                |
| 2026-08-12T11:58:50Z | `261c8210` | 25      | 5.47 | 6.00   | ok       | compute-runtime: stop an unroutable scheduled followup from failing its caller (#12543)                                         |
| 2026-08-12T17:48:48Z | `a53cabb3` | 25      | 5.47 | 6.00   | ok       | fix(echo-client): don't forward registry-only queries to the remote QueryService (#12547)                                       |
| 2026-08-12T22:01:19Z | `12b66180` | 25      | 5.47 | 6.00   | ok       | plugin-inbox: mailbox enrichment cascade — tiered pipelines, summaries, and project pipelines (#12546)                          |
| 2026-08-12T22:58:59Z | `a3b6ef05` | 24      | 4.97 | 6.00   | ok       | effect: migrate the monorepo from Effect 3 to Effect 4 (#12521)                                                                 |
| 2026-08-13T01:17:50Z | `987f7e1c` | 20      | 4.05 | 4.25   | ok       | plugins: XPlugin namespace entrypoints and subpath export validation (#12550)                                                   |
| 2026-08-13T05:23:39Z | `9c86066e` | 20      | 4.05 | 4.25   | ok       | inbox: progress meters, contact affordances, and whole-conversation summaries (#12553)                                          |
| 2026-08-13T06:01:13Z | `c7aaa57e` | 20      | 4.05 | 4.25   | ok       | review: implement agentic code-review harness (prepare/finalize + rules + skill) (#12526)                                       |
| 2026-08-13T07:37:02Z | `b7d66c87` | 20      | 4.05 | 4.25   | ok       | review: resolve agentic-review findings (workspace-deps, compat shims) (#12554)                                                 |
| 2026-08-13T10:16:46Z | `4ed7683d` | 20      | 4.05 | 4.25   | ok       | review: mark deferred no-sleep-in-test findings as ignored (#12556)                                                             |
| 2026-08-13T13:04:13Z | `7db68acf` | 20      | 4.05 | 4.25   | ok       | plugins: move Schema capability into capabilities/, mirroring Commands (#12563)                                                 |
| 2026-08-13T15:56:51Z | `8ca2ac7b` | 20      | 4.05 | 4.25   | ok       | compute-runtime: replace TriggerDispatcher polling with a reactive query (#12561)                                               |
| 2026-08-13T16:29:40Z | `bf4f1e6c` | 20      | 4.05 | 4.25   | ok       | app-graph: key observable atoms by reference (#12565)                                                                           |
| 2026-08-13T16:59:02Z | `76199e2b` | 20      | 4.05 | 4.25   | ok       | composer-app: repair the aborted dep scan and pin optimize-deps to a generated list (#12568)                                    |
| 2026-08-13T18:17:43Z | `375b863a` | 20      | 4.05 | 4.25   | ok       | feat(edge-client): proactively refresh the auth header before the advertised challenge TTL (#12566)                             |
| 2026-08-13T19:28:01Z | `3214dcf6` | 20      | 4.05 | 4.25   | ok       | app-graph, plugin-navtree: stop navtree hover from blocking the main thread (#12562)                                            |
| 2026-08-13T22:19:05Z | `61fe6764` | 20      | 4.06 | 4.25   | ok       | app-framework: defer activation events dispatched during startup (#12570)                                                       |
| 2026-08-13T22:47:10Z | `5fcd2385` | 20      | 4.06 | 4.25   | ok       | echo: implement Hash/Equal traits on ECHO entities (#12567)                                                                     |
| 2026-08-14T00:39:02Z | `559acfa9` | 20      | 4.06 | 4.25   | ok       | plugins: fix surface ids silently dropping the TaskSet and Excalidraw settings surfaces (#12572)                                |
| 2026-08-14T00:53:08Z | `ab797419` | 20      | 4.06 | 4.25   | ok       | deck: never mistake a plank that has not loaded for one that does not exist (#12569)                                            |
| 2026-08-14T01:55:35Z | `256f286d` | 20      | 4.06 | 4.25   | ok       | feat(projects): Project.status + the space-backed project-management skill (#12552)                                             |
| 2026-08-14T03:30:00Z | `098a0bb4` | 20      | 4.06 | 4.25   | ok       | inbox: virtual folders, archive, and sender enrichment (#12555)                                                                 |
| 2026-08-14T03:55:32Z | `f0480626` | 20      | 4.06 | 4.25   | ok       | ai: strip transport metadata from model fixtures; fix the query tool's in-example (#12576)                                      |
| 2026-08-14T04:13:55Z | `4804da07` | 20      | 4.06 | 4.25   | ok       | echo: support a computed (coalesce) group key in aggregate queries (#12574)                                                     |
| 2026-08-14T05:24:35Z | `eb95cd75` | 20      | 4.06 | 4.25   | ok       | schema: FeedAnnotation names the property holding the feed reference (#12575)                                                   |
| 2026-08-14T06:03:14Z | `8a77160e` | 20      | 4.06 | 4.25   | ok       | database: return schema summaries by default from schema-list (#12579)                                                          |
| 2026-08-14T07:36:38Z | `4e417e9d` | 20      | 4.05 | 4.25   | ok       | protocols: register client-services-effect-rpc project; delete protobuf service blocks for 9 services (#12578)                  |
| 2026-08-14T07:46:02Z | `5d816a6d` | 20      | 4.05 | 4.25   | ok       | edge-compute: retry a trigger force-run while edge is catching up (#12581)                                                      |
| 2026-08-14T08:24:13Z | `d62a9472` | 20      | 4.05 | 4.25   | ok       | protocols, echo-host, echo-client: stream feed sync state instead of polling (#12580)                                           |
| 2026-08-14T08:57:17Z | `48fd9fed` | 20      | 4.05 | 4.25   | ok       | halo: add personal-space-id and recovery-credential verbs to the Identity service (#12583)                                      |
| 2026-08-14T09:11:43Z | `4fc8f3a3` | 20      | 4.05 | 4.25   | ok       | echo: stop re-persisting stored automerge data on boot; halve indexer reads (#12564)                                            |
| 2026-08-14T09:49:39Z | `4663f249` | 20      | 4.03 | 4.25   | ok       | protocols, client-services: remove blob-sync feature and 22 dead proto files (#12586)                                           |
| 2026-08-14T10:13:50Z | `99e323d0` | 20      | 4.03 | 4.25   | ok       | echo-host: make storage prefix queries plain index range seeks (#12587)                                                         |
| 2026-08-14T10:22:33Z | `777d24a4` | 20      | 4.03 | 4.25   | ok       | halo: add an EDGE identity verb to the Identity service (#12588)                                                                |
| 2026-08-14T10:36:44Z | `2896a585` | 20      | 4.03 | 4.25   | ok       | protocols, client-services: remove value/filter/document proto and dead SpaceCache/DataMessage (#12589)                         |
| 2026-08-14T11:07:05Z | `490dc5b2` | 20      | 4.03 | 4.25   | ok       | moon-cache: fix disk-exhaustion gap in repo unit + README (#12590)                                                              |
| 2026-08-14T11:31:00Z | `6634b118` | 20      | 4.03 | 4.25   | ok       | plugin-onboarding: regenerate the Bramble exemplar space against current schemas (#12592)                                       |
| 2026-08-14T12:43:52Z | `0ef896fb` | 20      | 4.03 | 4.25   | ok       | halo: complete the consumer-migration surface — invitation flows, devices, grant, atom (#12593)                                 |
| 2026-08-14T12:58:30Z | `08c82f9e` | 20      | 4.03 | 4.25   | ok       | feat(plugin-projects): project projects.create as the projectCreate MCP tool (#12591)                                           |
| 2026-08-14T13:12:08Z | `1c995c46` | 20      | 4.03 | 4.25   | ok       | client-services, edge-client: defer edge networking until the worker has booted (#12585)                                        |
| 2026-08-14T15:31:43Z | `ae437d1b` | 20      | 4.03 | 4.25   | ok       | release: gate a PR to one changeset (#12571)                                                                                    |
| 2026-08-14T17:02:45Z | `89041841` | 20      | 4.03 | 4.25   | ok       | plugin-simple-layout: fix stack tile row layout, story operation handler, toolbar role (#12600)                                 |
| 2026-08-14T19:48:01Z | `58d834de` | 20      | 4.03 | 4.25   | ok       | composer-app: fix WebKit dev-server boot and narrow tauri dev deps (#12602)                                                     |
| 2026-08-14T20:40:21Z | `24fcadc0` | 20      | 4.03 | 4.25   | ok       | cli: hide OAuth callback server HTTP logs unless --verbose (#12603)                                                             |
| 2026-08-14T22:47:00Z | `3e9a10f1` | 20      | 4.03 | 4.25   | ok       | inbox, react-ui-card, react-ui-form: fix defects found driving the live mailbox (#12577)                                        |
| 2026-08-14T23:05:17Z | `8363f124` | 20      | 4.03 | 4.25   | ok       | assistant: fix AI model resolvers never reaching the AI service (#12604)                                                        |
| 2026-08-15T00:15:31Z | `c6495752` | 20      | 4.03 | 4.25   | ok       | mcp-server: extract the MCP surface into @dxos/mcp-server and run it locally as `dx mcp serve` (#12597)                         |
| 2026-08-15T05:03:35Z | `a69d8619` | 20      | 4.03 | 4.25   | ok       | echo: drop Ref.byAnnotation, restoring the #12575 review decision (#12612)                                                      |
| 2026-08-15T10:11:06Z | `e56276b4` | 20      | 4.03 | 4.25   | ok       | protocols: finish client-services proto removal — DataService, DevtoolsHost, SpacesService (#12596)                             |
| 2026-08-15T18:52:58Z | `526147b3` | 20      | 4.03 | 4.25   | ok       | tools: ship /project as the dxos-project Claude Code plugin (#12618)                                                            |
| 2026-08-15T19:39:44Z | `306f50dc` | 20      | 4.03 | 4.25   | ok       | inbox, react-ui, app-framework: provider operations, Banner, Deferred, card depiction, trigger poll (#12605)                    |
| 2026-08-15T20:05:13Z | `20e86bab` | 20      | 4.03 | 4.25   | ok       | plugin-space: filter related objects by type (#12613)                                                                           |
| 2026-08-15T23:51:59Z | `21643b92` | 20      | 4.03 | 4.25   | ok       | tools: rename the plugin to dxos so the command reads /dxos:project (#12620)                                                    |
| 2026-08-16T00:55:41Z | `cee92a2a` | 20      | 4.03 | 4.25   | ok       | tools: update dxos plugin (#12622)                                                                                              |
| 2026-08-16T02:32:37Z | `592b00e4` | 20      | 4.03 | 4.25   | ok       | inbox: design bidirectional mailbox tag sync (#12611)                                                                           |
| 2026-08-16T03:00:12Z | `a8892a55` | 20      | 4.03 | 4.25   | ok       | storybook: upgrade to Storybook 10.5.8 (#12625)                                                                                 |
| 2026-08-16T03:47:59Z | `6c881a23` | 20      | 4.03 | 4.25   | ok       | react-ui-components: atomic query editor tags, tag spacing, and selectionEnd fix (#12626)                                       |
| 2026-08-16T07:31:28Z | `8ceabfa8` | 20      | 4.03 | 4.25   | ok       | inbox, projects, compute-runtime: address review on #12605 (#12621)                                                             |
| 2026-08-16T08:33:28Z | `d1949c4b` | 20      | 4.03 | 4.25   | ok       | vite: bump vite/@vitejs/*/storybook-icons/tailwindcss-vite ecosystem (#12004)                                                   |
| 2026-08-16T09:42:39Z | `f7db9a06` | 20      | 4.03 | 4.25   | ok       | codemirror: bump @codemirror/lang-html, lang-markdown, view (patch) (#12631)                                                    |
| 2026-08-16T10:28:02Z | `3570594b` | 20      | 4.03 | 4.25   | ok       | swc: bump @swc/core and @swc/types (patch/minor) (#12633)                                                                       |
| 2026-08-16T10:59:08Z | `74001287` | 20      | 4.03 | 4.25   | ok       | oxlint: bump oxfmt, oxlint, and required oxlint-tsgolint peer (#12635)                                                          |
| 2026-08-17T02:12:05Z | `cd205fb2` | 20      | 4.03 | 4.25   | ok       | agent-claude: run the Claude Agent SDK as a DXOS agent and project it into ECHO (#12614)                                        |
| 2026-08-17T08:29:18Z | `6af130ff` | 20      | 4.03 | 4.25   | ok       | echo, compute-runtime: resume feed queries from a cursor and wake feed triggers on append (#12615)                              |
| 2026-08-17T11:45:52Z | `40b50c2c` | 20      | 4.03 | 4.25   | ok       | plugin-assistant: filter the trace panel's process list by process environment (#12624)                                         |
| 2026-08-17T12:07:06Z | `1baaf4e2` | 20      | 4.03 | 4.25   | ok       | plugin-computer: dev-only coding harness with a bash tool and a multi-string-replace tool (#12638)                              |
| 2026-08-17T13:02:40Z | `48ea128d` | 20      | 4.03 | 4.25   | ok       | config: resolve the hub URL outside the browser (#12642)                                                                        |
| 2026-08-17T18:59:25Z | `df0ab571` | 20      | 4.03 | 4.25   | ok       | inbox: mailbox Connect button, remote sync progress delivery, swarm announcements panel (#12643)                                |
| 2026-08-17T21:05:58Z | `3ee20ca6` | 20      | 4.03 | 4.25   | ok       | mosaic, kanban, halo: fix the un-quarantined e2e failures (#12641)                                                              |
| 2026-08-17T23:28:17Z | `6328de3e` | 20      | 4.03 | 4.25   | ok       | connector: always offer Connect or Sync, and keep a binding's sync state when its connection is deleted (#12548)                |
| 2026-08-18T00:09:48Z | `813069ce` | 20      | 4.03 | 4.25   | ok       | react-ui: audit raw DOM in plugin containers; extend Flex and convert 127 wrappers (#12573)                                     |
| 2026-08-18T01:09:10Z | `e7fc0234` | 20      | 4.03 | 4.25   | ok       | plugins: replace ./operations and ./skills barrels with per-symbol subpaths (#12617)                                            |
| 2026-08-18T07:52:49Z | `f3c5e129` | 20      | 4.03 | 4.25   | ok       | dxos-plugin: drop the gh pr list fallback from the history verb (#12623)                                                        |
| 2026-08-18T08:13:15Z | `cc9b81fc` | 20      | 4.03 | 4.25   | ok       | react-ui-feed: model-driven feed engine, virtualizer and debug entry points (#12627)                                            |
| 2026-08-18T09:56:13Z | `2ced2aaf` | 20      | 4.03 | 4.25   | ok       | build: upgrade to TypeScript 7 (#12647)                                                                                         |
| 2026-08-18T12:38:11Z | `75971ad0` | 20      | 4.03 | 4.25   | ok       | cli: plugin management and third-party plugin installs (#12606)                                                                 |
| 2026-08-18T12:55:09Z | `4f55909b` | 20      | 4.03 | 4.25   | ok       | plugin-connector: account-level sync operations; plugin-routine: composite RoutineForm reused in the create dialog (#12549)     |
| 2026-08-18T13:20:47Z | `85bdad26` | 20      | 4.03 | 4.25   | ok       | echo: make graph-node type lookups reactive to schema registration (#12646)                                                     |
| 2026-08-18T14:24:22Z | `e2eecf23` | 20      | 4.03 | 4.25   | ok       | agentic-review: fix ancestor detection, resolve no-compat-shims and no-echo-internal-in-sdk (#12650)                            |
| 2026-08-18T14:51:09Z | `b0953f02` | 20      | 4.03 | 4.25   | ok       | edge-client: pre-authenticate every endpoint the edge worker authenticates (#12652)                                             |
| 2026-08-18T16:13:39Z | `83bfa75f` | 20      | 4.03 | 4.25   | ok       | cli: add `dx mcp serve --watch`, in the binary as well as from source (#12607)                                                  |
| 2026-08-18T20:00:13Z | `069e8edc` | 20      | 4.03 | 4.25   | ok       | cli: give local profiles parity with Composer's local dev config (#12658)                                                       |
| 2026-08-18T20:43:35Z | `c2d86d06` | 20      | 4.03 | 4.25   | ok       | Add authorizing device dialog for magic-link token redemption (#12659)                                                          |
| 2026-08-18T22:26:24Z | `4cb12a92` | 20      | 4.03 | 4.25   | ok       | react-ui-virtual + react-ui-assistant: the virtualizer and the assistant thread graduate to packages (#12648)                   |
| 2026-08-18T23:00:29Z | `32353e67` | 20      | 4.03 | 4.25   | ok       | plugin-projects: cleanup project data model — milestones, project slimming, sync updates (#12595)                               |
| 2026-08-18T23:35:11Z | `ffb3c449` | 20      | 4.03 | 4.25   | ok       | ci, composer-app: nightly/dev environments, per-channel app identity (#12501)                                                   |
| 2026-08-19T00:14:26Z | `50c98d35` | 20      | 4.03 | 4.25   | ok       | ci: stop setup-node's default cache from failing the tauri draft job (#12660)                                                   |
| 2026-08-19T01:09:54Z | `37930d1b` | 20      | 4.03 | 4.25   | ok       | ci: disable setup-node's real caching switch, not the wrong input (#12661)                                                      |
| 2026-08-19T01:34:31Z | `b2362b0d` | 20      | 4.03 | 4.25   | ok       | composer-app: allow every composer.space subdomain in the worker's own origin check (#12663)                                    |
| 2026-08-19T02:19:27Z | `0a7d273d` | 20      | 4.03 | 4.25   | ok       | react-ui-assistant: default MessageChrome context so a missing provider degrades instead of crashing (#12664)                   |
| 2026-08-19T03:53:58Z | `d094b1e2` | 20      | 4.03 | 4.25   | ok       | plugin-illustrator: UML class-diagram dialect, skill, and unified story harness (#12662)                                        |
| 2026-08-19T06:11:48Z | `89bca653` | 20      | 4.03 | 4.25   | ok       | react-ui-assistant: registry and MessageChrome stories; inline reference widget (#12666)                                        |
| 2026-08-19T09:42:53Z | `51f45abf` | 20      | 4.03 | 4.25   | ok       | composer-app: regenerate optimizeDeps for the TypeScript 6 compat package (#12653)                                              |
| 2026-08-19T10:01:07Z | `02e84e69` | 20      | 4.03 | 4.25   | ok       | echo-client-e2e: add SQLite vs ECHO benchmarks for feed and automerge objects (#12649)                                          |
| 2026-08-19T10:22:28Z | `ee5112cf` | 20      | 4.03 | 4.25   | ok       | ci: drop the redundant jq installs from the tauri jobs (#12665)                                                                 |
| 2026-08-19T10:59:01Z | `bdd61ebf` | 20      | 4.03 | 4.25   | ok       | composer-app: read the chat e2e thread across per-message editors (#12667)                                                      |
| 2026-08-19T13:58:02Z | `842d6ac6` | 20      | 4.03 | 4.25   | ok       | composer-app: load vite.config.ts with Vite's native config loader (#12640)                                                     |
| 2026-08-19T14:21:36Z | `85e6347f` | 20      | 4.03 | 4.25   | ok       | onboarding: fix email login on composer dev and stop mislabelling failures as expired links (#12669)                            |
| 2026-08-19T19:32:28Z | `f56ef6c4` | 20      | 4.03 | 4.25   | ok       | composer-app: fixed production plugin set, extensible nightly (#12670)                                                          |
| 2026-08-19T20:14:24Z | `b65d4fba` | 20      | 4.04 | 4.25   | ok       | Mobile tweaks (#12644)                                                                                                          |
| 2026-08-19T21:32:13Z | `a3d45c4f` | 20      | 4.04 | 4.25   | ok       | composer: align type hues, hide unrenderable types, gate the registry button (#12674)                                           |
| 2026-08-19T22:40:30Z | `279aff75` | 20      | 4.04 | 4.25   | ok       | release: rename the `nightly` deploy environment to `preview` (#12679)                                                          |
| 2026-08-20T00:45:46Z | `16bf954d` | 20      | 4.04 | 4.25   | ok       | scripts: fix `pnpm secrets remote dev`; reserve the title `preview` for the environment (#12680)                                |
| 2026-08-20T01:29:27Z | `debd6c87` | 20      | 4.04 | 4.25   | ok       | scripts: point the verify hint at the undeployed version (#12681)                                                               |
| 2026-08-20T08:32:39Z | `c8b71587` | 20      | 4.04 | 4.25   | ok       | echo-client: fix O(n²) feed append; add batched-insert benchmark (#12668)                                                       |
| 2026-08-20T08:53:05Z | `f0d0e431` | 20      | 4.04 | 4.25   | ok       | client-services: migrate devtools Stream producers to effect/Stream (#12672)                                                    |
| 2026-08-20T14:05:12Z | `f8ec427b` | 20      | 4.04 | 4.25   | ok       | composer-app: monochrome template menu bar icon; promote projects plugin to alpha (#12682)                                      |
| 2026-08-20T15:17:34Z | `63629c50` | 20      | 4.04 | 4.25   | ok       | client: fix stale sync progress; one replication monitor per space (#12683)                                                     |
| 2026-08-20T18:21:16Z | `73ee34b4` | 21      | 4.00 | 4.25   | ok       | composer-app: remove top-level await from the bundle — automerge/wnfs slim entrypoints, explicit wasm init (#12684)             |
| 2026-08-20T18:42:37Z | `41f8bee9` | 21      | 4.00 | 4.25   | ok       | composer-app: give each release channel its own localhost asset-server port (#12685)                                            |
| 2026-08-20T20:23:16Z | `2d327bbb` | 21      | 4.00 | 4.25   | ok       | composer-app: fix tauri build — use include_image! for the menu bar icon (#12687)                                               |
| 2026-08-20T21:14:00Z | `63e500bb` | 21      | 4.00 | 4.25   | ok       | mcp: skills are the atomic unit of MCP projection (#12616)                                                                      |
| 2026-08-20T22:05:13Z | `2531b942` | 21      | 4.00 | 4.25   | ok       | agents: install the dxos plugin in cloud containers, correct the hook claims (#12691)                                           |
| 2026-08-20T22:19:05Z | `dbff1e4b` | 21      | 4.00 | 4.25   | ok       | cli: stamp new spaces as migrated, remove `halo create`, and sync all spaces to EDGE (#12689)                                   |
| 2026-08-21T01:06:17Z | `bb941246` | 21      | 4.00 | 4.25   | ok       | onboarding, connector: run desktop OAuth in the system browser (#12690)                                                         |
| 2026-08-21T01:20:04Z | `6ca75f7c` | 21      | 4.00 | 4.25   | ok       | plugin-space: persist a described object, do not only reference it (#12694)                                                     |
| 2026-08-21T01:58:04Z | `0de23cd7` | 21      | 4.00 | 4.25   | ok       | app-toolkit: emit the NativeOAuth entry the export map already promises (#12695)                                                |
| 2026-08-21T06:07:45Z | `f189f356` | 21      | 4.00 | 4.25   | ok       | moon: route prebuild through a `prebuild` task tag (#12696)                                                                     |
| 2026-08-21T07:27:29Z | `5ceaf9c4` | 21      | 4.00 | 4.25   | ok       | edge-client: migrate HTTP routes to per-service prefixes (#12697)                                                               |
| 2026-08-21T10:57:00Z | `cc112974` | 21      | 4.00 | 4.25   | ok       | worker-framework: fix leader-lock election and worker session reclaim (#12688)                                                  |
| 2026-08-21T13:22:16Z | `5b504b4a` | 21      | 4.00 | 4.25   | ok       | echo: decode recursive JSON schema through a suspend (#12698)                                                                   |
| 2026-08-21T13:53:25Z | `d3913bd2` | 21      | 4.00 | 4.25   | ok       | worker-framework: add manually-run Playwright worker stress suite (#12700)                                                      |
| 2026-08-21T17:34:35Z | `e094f74f` | 21      | 4.00 | 4.25   | ok       | mcp: generic operation discovery + invoke surface (#12692)                                                                      |
| 2026-08-21T19:14:40Z | `84cd793f` | 21      | 4.00 | 4.25   | ok       | ci: retry+degrade moon cache preflight, resize cache droplet for headroom (#12703)                                              |
| 2026-08-21T19:42:47Z | `79d5ecf4` | 21      | 4.00 | 4.25   | ok       | mcp: project host discovery as operations (#12693)                                                                              |
| 2026-08-21T20:44:23Z | `4c107a27` | 21      | 4.00 | 4.25   | ok       | echo: compose full-text search with type filters; scope search plugin to user-visible types (#12701)                            |
| 2026-08-21T21:18:13Z | `003f2d8e` | 21      | 4.00 | 4.25   | ok       | plugin-search: swap search and command palette shortcuts (#12706)                                                               |
| 2026-08-22T15:36:21Z | `77a2d34c` | 21      | 4.00 | 4.25   | ok       | plugin-space: one generic object-form dialog, returning what it created (#12708)                                                |
| 2026-08-22T18:23:45Z | `5180720d` | 21      | 4.00 | 4.25   | ok       | compute: evict a failed lazy operation handler load so retries re-import (#12709)                                               |
| 2026-08-23T03:03:49Z | `0a3e9ddd` | 21      | 4.00 | 4.25   | ok       | react-ui, react-ui-components: one progress readout, assembled from a bar, a stepper and a crawl (#12716)                       |
| 2026-08-23T05:49:16Z | `5bb340f5` | 21      | 4.00 | 4.25   | ok       | plugin-inbox, plugin-script: parse every legal From header, not just one shape (#12718)                                         |
| 2026-08-23T05:59:01Z | `461ce1e1` | 21      | 4.01 | 4.25   | ok       | worker-framework: bound leader-lock steals so a wedged tab cannot restart every worker (#12707)                                 |
| 2026-08-23T06:47:25Z | `96281430` | 21      | 4.01 | 4.25   | ok       | skills: add user-submissions triage skill (#12711)                                                                              |
| 2026-08-23T08:26:23Z | `32468c31` | 21      | 4.01 | 4.25   | ok       | plugin-lingo: a reading companion for language learners (#12712)                                                                |
| 2026-08-23T09:12:27Z | `49aee6cb` | 21      | 4.01 | 4.25   | ok       | assistant: let completeJob accept null and never lose a completed job (#12721)                                                  |
| 2026-08-23T09:39:57Z | `1e2a300b` | 21      | 4.01 | 4.25   | ok       | plugin-google, plugin-jmap: lower the mail sync per-run budget to fit the smallest host (#12720)                                |
| 2026-08-23T19:09:38Z | `0a7dcd56` | 21      | 4.01 | 4.25   | ok       | moon: upgrade to 2.5.2 and share one build cache across worktrees (#12724)                                                      |
| 2026-08-23T23:14:06Z | `4718992e` | 21      | 4.01 | 4.25   | ok       | plugin-file-system: rename plugin-native-filesystem to plugin-file-system (#12723)                                              |
| 2026-08-23T23:57:39Z | `7d000b91` | 21      | 4.01 | 4.25   | ok       | echo: normalize Chat ownership onto the parent edge (Filter.hasParent, remove CompanionTo) (#12675)                             |
| 2026-08-24T00:39:47Z | `78523d2f` | 21      | 4.01 | 4.25   | ok       | assistant: derive model-facing tool names from operation keys (#12677)                                                          |
| 2026-08-24T01:01:23Z | `318bbad8` | 21      | 4.01 | 4.25   | ok       | plugin-client: order first-run schema registration ahead of its consumers (#12722)                                              |
| 2026-08-24T02:34:07Z | `86d14822` | 21      | 4.01 | 4.25   | ok       | deus: add a QA flow dialect for human and agent testers (#12713)                                                                |
| 2026-08-24T11:36:29Z | `ca34a80a` | 21      | 4.01 | 4.25   | ok       | echo: add Migration.defineRename for renamed named entities (#12725)                                                            |
| 2026-08-24T12:29:50Z | `4560ba3a` | 21      | 4.04 | 4.25   | ok       | observability: OTel metrics for spaces, sync, EDGE reconnects, memory and runtime lag (#12702)                                  |
| 2026-08-24T14:17:15Z | `40ecd440` | 21      | 4.04 | 4.25   | ok       | assistant, plugin-ibkr: report the real cause of two swallowed failures (#12729)                                                |
| 2026-08-24T14:45:10Z | `5305365b` | 21      | 4.04 | 4.25   | ok       | app-framework: run plugin body imports concurrently (#12656)                                                                    |
| 2026-08-24T16:15:17Z | `bdb02cd3` | 21      | 4.04 | 4.25   | ok       | protocols: audit protobuf.js usage and start the buf migration (#12727)                                                         |
| 2026-08-24T16:51:50Z | `4802d68c` | 21      | 4.04 | 4.25   | ok       | ci: split boot budget into its own job and shard the vitest jobs (#12730)                                                       |
| 2026-08-24T23:05:12Z | `e8088eaf` | 21      | 4.05 | 4.25   | ok       | util: fix downloads and feedback log uploads in the native app (#12715)                                                         |
| 2026-08-25T02:41:22Z | `cd4da46d` | 21      | 4.05 | 4.25   | ok       | magazine, outliner, projects: fix curation and outline defects found driving the live app (#12737)                              |
| 2026-08-25T03:57:57Z | `9f7ff6c7` | 21      | 4.05 | 4.25   | ok       | app-framework, ui-editor: follow-up review fixes from #12737 (#12738)                                                           |
| 2026-08-25T13:38:13Z | `b8762efc` | 21      | 4.05 | 4.25   | ok       | assistant: bind chat context through a contributed capability (#12735)                                                          |
| 2026-08-25T14:18:42Z | `f4c27025` | 21      | 4.05 | 4.25   | ok       | plugin-routine, compute: make routine ownership explicit, drop the routines companion (#12736)                                  |
| 2026-08-25T14:43:18Z | `ba052982` | 21      | 4.05 | 4.25   | ok       | ci: size the moon cache from RAM, and fix the bench harness that hid it (#12744)                                                |
| 2026-08-25T15:04:34Z | `ffbd4dc6` | 21      | 4.05 | 4.25   | ok       | plugin-claude-agents: add plugin for Claude managed agents (#12741)                                                             |
| 2026-08-25T15:38:04Z | `5e8878c5` | 21      | 4.05 | 4.25   | ok       | echo: release feed objects once nothing holds them, and measure what stays resident (#12745)                                    |
| 2026-08-25T18:28:42Z | `22bea85f` | 21      | 4.15 | 4.25   | ok       | config: convert dxos.config to buf (#12733)                                                                                     |
| 2026-08-25T19:20:32Z | `3e022015` | 21      | 4.15 | 4.25   | ok       | config, ci: point dev-tier clients at EDGE preview; retire the labs introspect defaults (DX-1150) (#12747)                      |
| 2026-08-25T21:56:51Z | `f2b75fa3` | 21      | 4.16 | 4.25   | ok       | plugin-lametric: show a space on a LaMetric TIME over a shared space-dashboard capability (#12749)                              |
| 2026-08-25T22:23:27Z | `0e228914` | 21      | 4.16 | 4.25   | ok       | plugins, types: replace the deprecated getSpace where only a database is needed (#12746)                                        |
| 2026-08-25T22:44:22Z | `6d28380f` | 21      | 4.16 | 4.25   | ok       | plugin-deck: mobile support (navigation stack), retire plugin-simple-layout (#12676)                                            |
| 2026-08-25T23:31:32Z | `84568a0c` | 21      | 4.16 | 4.25   | ok       | plugin-google: drop gmail.readonly and pin OAuth scope sets (DX-794) (#12740)                                                   |
| 2026-08-26T01:27:05Z | `9684ee84` | 21      | 4.16 | 4.25   | ok       | projects: one project skill (#12704)                                                                                            |
| 2026-08-26T02:53:46Z | `1ab4bb8c` | 21      | 4.16 | 4.25   | ok       | plugins: single canonical plugin definitions with generated headless capability barrels (#12610)                                |
| 2026-08-26T03:25:19Z | `b02fe163` | 22      | 4.18 | 4.25   | ok       | graph: rebuild @dxos/graph on Effect's Graph module (#12594)                                                                    |
| 2026-08-26T06:59:00Z | `51c7e912` | 22      | 4.18 | 4.25   | ok       | assistant-toolkit: fix live sub-agent delegation; Chat.taskSet replaces the markdown checklist (#12752)                         |
| 2026-08-26T09:12:54Z | `48eb05d6` | 22      | 4.24 | 4.25   | ok       | protocols: route protoMessage through buf; fix Struct double-encoding (#12748)                                                  |
| 2026-08-26T09:35:37Z | `3d4a4da1` | 22      | 4.24 | 4.25   | ok       | echo: log subduction sync decisions and non-converging collection sync (#12742)                                                 |
| 2026-08-26T09:56:23Z | `9817b6f2` | 22      | 4.25 | 4.25   | ok       | echo: release automerge objects and their documents once nothing holds them (#12750)                                            |
| 2026-08-26T11:24:24Z | `f8bfba0f` | 22      | 4.25 | 4.25   | ok       | echo: credentials in an automerge document, behind DX_AUTOMERGE_CREDENTIALS (#12726)                                            |
| 2026-08-26T11:49:04Z | `8db69c61` | 22      | 4.25 | 4.25   | ok       | fix(react-ui-assistant): build the translations entry the manifest declares (#12756)                                            |
| 2026-08-26T12:30:23Z | `e954c0ff` | 22      | 4.25 | 4.25   | **OVER** | protocols: resolve google.protobuf.Any in shape-compat; move the metadata stores to buf (#12753)                                |
| 2026-08-26T12:34:19Z | `5755a428` | 22      | 4.25 | 4.25   | **OVER** | ci: validate docs links on PRs (#12754)                                                                                         |
| 2026-08-26T13:10:40Z | `dde67142` | 22      | 4.25 | 4.25   | **OVER** | edge-client: floor connection uptime to whole seconds (#12760)                                                                  |
| 2026-08-26T13:15:26Z | `5f6808cc` | 22      | 4.25 | 4.25   | **OVER** | ci: partial-clone every full-depth checkout and drop the no-op LFS fetch (#12757)                                               |
