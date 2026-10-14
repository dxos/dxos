---
branch: dm/optimistic-cannon-l1qvnp
commit: 112d19805d748b72a8d16e90190791b417f17ac3
base: 7b479515d942c93d7f4fb0c2fbaa7d121b390c00
mode: fast
createdAt: 2026-10-14T06:15:51.874Z
isFinalized: true
groups: 200
rules: [atom-lifetime-bound-to-owner, headless-leak-check-per-workerd-plugin, log-fire-and-forget-rejections, no-startup-permission-prompts, no-try-catch-in-effect-code, operations-resolve-database-from-service, operations-take-refs-not-ids, story-for-new-ui-component]
reviewId: 112d1980
---

_0 error(s), 13 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 112d1980-1 - resolved - headless-leak-check-per-workerd-plugin - packages/plugins/plugin-meeting-recorder/moon.yml:13
- 112d1980-2 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-meeting-recorder/src/capabilities/state.ts:13
- 112d1980-3 - ignored - story-for-new-ui-component - packages/plugins/plugin-meeting-recorder/src/components/RecorderStatus.tsx:43
- 112d1980-4 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-meeting-recorder/src/operations/start.ts:48
- 112d1980-5 - ignored - no-startup-permission-prompts - packages/plugins/plugin-meeting-recorder/src/recorder/session.ts:53
- 112d1980-6 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-meeting-recorder/src/recorder/session.ts:101
- 112d1980-7 - resolved - log-fire-and-forget-rejections - packages/plugins/plugin-meeting-recorder/src/recorder/session.ts:125
- 112d1980-8 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-meeting-recorder/src/types/MeetingRecorderCapabilities.ts:77
- 112d1980-9 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-meeting-recorder/src/types/MeetingRecorderOperation.ts:20
- 112d1980-10 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-meeting/src/operations/create.ts:14
- 112d1980-11 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-meeting/src/types/MeetingOperation.ts:29
- 112d1980-12 - ignored - operations-take-refs-not-ids - packages/plugins/plugin-meeting/src/types/MeetingOperation.ts:52
- 112d1980-13 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-transcription/src/transcription-manager.ts:189

## Issues

# WARN 112d1980-1 headless-leak-check-per-workerd-plugin `packages/plugins/plugin-meeting-recorder/moon.yml:13`

System One judges this a likely violation of `headless-leak-check-per-workerd-plugin` (Every plugin with a workerd variant has a React-leak check tracing only worker conditions, with a target of zero), p=0.94. The likeliest place is lines 13-27 (`--export ./MeetingRecorderPlugin`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-2 atom-lifetime-bound-to-owner `packages/plugins/plugin-meeting-recorder/src/capabilities/state.ts:13`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.88. The likeliest place is lines 13-20 (`Effect.sync(() =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-3 story-for-new-ui-component `packages/plugins/plugin-meeting-recorder/src/components/RecorderStatus.tsx:43`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 43-54 (`export const RecorderStatus = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-4 operations-resolve-database-from-service `packages/plugins/plugin-meeting-recorder/src/operations/start.ts:48`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.96. The likeliest place is lines 48-59 (`return space.db;`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-5 no-startup-permission-prompts `packages/plugins/plugin-meeting-recorder/src/recorder/session.ts:53`

System One judges this a likely violation of `no-startup-permission-prompts` (A plugin that asks for a browser permission at startup is never enabled by default), p=0.84. The likeliest place is lines 53-64 (`}`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-6 no-try-catch-in-effect-code `packages/plugins/plugin-meeting-recorder/src/recorder/session.ts:101`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 101-112 (`async #startSystemAudio(feed: Feed.Feed, othersLabel: string): Promise<void> {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-7 log-fire-and-forget-rejections `packages/plugins/plugin-meeting-recorder/src/recorder/session.ts:125`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.94. The likeliest place is lines 125-136 (`);`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-8 operations-resolve-database-from-service `packages/plugins/plugin-meeting-recorder/src/types/MeetingRecorderCapabilities.ts:77`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.94. The likeliest place is lines 77-85 (`export interface Recorder {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-9 operations-resolve-database-from-service `packages/plugins/plugin-meeting-recorder/src/types/MeetingRecorderOperation.ts:20`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 20-31 (`export const Start = Operation.make({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-10 operations-resolve-database-from-service `packages/plugins/plugin-meeting/src/operations/create.ts:14`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.96. The likeliest place is lines 14-25 (`const handler: Operation.WithHandler<typeof MeetingOperation.Create> = Meetin...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-11 operations-resolve-database-from-service `packages/plugins/plugin-meeting/src/types/MeetingOperation.ts:29`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 29-36 (`db: Schema.optional(Database.Database),`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-12 operations-take-refs-not-ids `packages/plugins/plugin-meeting/src/types/MeetingOperation.ts:52`

System One judges this a likely violation of `operations-take-refs-not-ids` (Operations identify objects by Ref, never by a raw id string), p=0.92. The likeliest place is lines 52-63 (`export const HandlePayload = Operation.make({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 112d1980-13 no-try-catch-in-effect-code `packages/plugins/plugin-transcription/src/transcription-manager.ts:189`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 189-200 (`} catch (err) {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `7b479515d942c93d7f4fb0c2fbaa7d121b390c00`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 13 violations written to fragments, 169 uncertain, 1506 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 681 (127 verdicts re-asked with context the model requested)
estimated input tokens: 2959672
billed input tokens: 2690352 (cost $0.1130)
measured chars per token: 3.30
```
