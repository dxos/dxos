---
branch: claude/calltranscription-storybook-preview-178eaa
commit: befe514ddcd48bec5b467a81c600fa67a1769192
base: 524906089ef496b70bf7b8012df48a700816940a
mode: fast
createdAt: 2026-11-11T18:25:50.182Z
isFinalized: true
groups: 107
rules: [consistent-file-naming-within-folder, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, no-casts, no-invented-theme-tokens, no-sleep-in-test, no-try-catch-in-effect-code, no-unused-new-api, toolbars-are-menu-actions]
reviewId: befe514ddc
---

_2 error(s), 11 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- befe514ddc-1 - ignored - no-invented-theme-tokens - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:85
- befe514ddc-2 - ignored - no-unused-new-api - packages/plugins/plugin-client/src/testing/bindTestAccount.ts:40
- befe514ddc-3 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/testing/bindTestAccount.ts:40
- befe514ddc-4 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/Meeting.stories.tsx:111
- befe514ddc-5 - resolved - errors-extend-base-error - packages/plugins/plugin-meeting/src/stories/Meeting.stories.tsx:220
- befe514ddc-6 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-meeting/src/stories/Meeting.stories.tsx:264
- befe514ddc-7 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:128
- befe514ddc-8 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:152
- befe514ddc-9 - ignored - no-casts - packages/plugins/plugin-transcription/src/testing/decorators.ts:25
- befe514ddc-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-transcription/src/testing/decorators.ts:25
- befe514ddc-11 - ignored - error-messages-carry-context - packages/ui/react-ui-transcription/src/hooks/useAudioFile.test.ts:74
- befe514ddc-12 - resolved - no-sleep-in-test - packages/ui/react-ui-transcription/src/hooks/useAudioFile.test.ts:74
- befe514ddc-13 - ignored - no-try-catch-in-effect-code - packages/ui/react-ui-transcription/src/hooks/useAudioFile.ts:19

## Issues

# WARN befe514ddc-1 no-invented-theme-tokens `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:85`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 85-96 (`'rounded-md outline outline-2 outline-neutral-900 transition-[outline-color] ...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-2 no-unused-new-api `packages/plugins/plugin-client/src/testing/bindTestAccount.ts:40`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.80. The likeliest place is lines 40-51 (`export const bindTestAccount = (client: Client, { hubUrl, email }: BindTestAc...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/testing/bindTestAccount.ts:40`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 40-51 (`export const bindTestAccount = (client: Client, { hubUrl, email }: BindTestAc...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-4 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/Meeting.stories.tsx:111`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 111-124 (`</Toolbar.Root>`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR befe514ddc-5 errors-extend-base-error `packages/plugins/plugin-meeting/src/stories/Meeting.stories.tsx:220`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 220-236 (`};`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-6 consistent-file-naming-within-folder `packages/plugins/plugin-meeting/src/stories/Meeting.stories.tsx:264`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.83. The likeliest place is lines 264-275 (`const meta = {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-7 toolbars-are-menu-actions `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:128`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 128-139 (`const TranscriptPanel = ({`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-8 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:152`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 152-163 (`const LiveStory = () => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR befe514ddc-9 no-casts `packages/plugins/plugin-transcription/src/testing/decorators.ts:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 25-36 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-10 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-transcription/src/testing/decorators.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 25-36 (`export const enableQueryIndexes = (services: { QueryService?: any }) =>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-11 error-messages-carry-context `packages/ui/react-ui-transcription/src/hooks/useAudioFile.test.ts:74`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 74-88 (`network.settle('a').reject(new Error('a failed'));`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-12 no-sleep-in-test `packages/ui/react-ui-transcription/src/hooks/useAudioFile.test.ts:74`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 74-88 (`network.settle('a').reject(new Error('a failed'));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN befe514ddc-13 no-try-catch-in-effect-code `packages/ui/react-ui-transcription/src/hooks/useAudioFile.ts:19`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 19-30 (`export const useAudioFile = (audioUrl: string, constraints?: MediaTrackConstr...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `524906089ef496b70bf7b8012df48a700816940a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 13 violations written to fragments, 271 uncertain, 309 clean, 0 unanswered
- left for an agentic reviewer: 79 batch(es)

```text
requests: 355 (151 verdicts re-asked with context the model requested)
estimated input tokens: 1787532
billed input tokens: 1701327 (cost $0.0715)
measured chars per token: 3.15
```

### Dispositions

- befe514ddc-1 ignored: the outline classes predate this PR, which only renamed the tile's hover group on that element.
- befe514ddc-2 ignored: `bindTestAccount` is called by `useTestAccount`, and exported for stories that bind outside React.
- befe514ddc-3 resolved: `bindTestAccount` is defined with `Effect.fnUntraced`.
- befe514ddc-4, befe514ddc-7 ignored: these toolbars are story harness controls, not a container's toolbar, so there is no `attendableId` to build menu actions for.
- befe514ddc-5 resolved: `JoinSpaceError` extends `BaseError.extend`.
- befe514ddc-6 ignored: both files in `src/stories/` are PascalCase `*.stories.tsx`.
- befe514ddc-8 ignored: the microphone lifecycle reads the pipeline phase, and the pipeline reads the track it produces, so extracting it would split one cycle across two hooks.
- befe514ddc-9, befe514ddc-10 ignored: `enableQueryIndexes` predates this PR and none of its stories call it; typing it removes the `any` but then needs buf `IndexKind` messages and two new dependencies, which is its own change.
- befe514ddc-11 ignored: the error is a test fixture standing in for a failed fetch.
- befe514ddc-12 resolved: the test waits for the hook to log the superseded failure instead of sleeping.
- befe514ddc-13 ignored: `useAudioFile` is a React hook with `async`/`await`, not Effect code.
