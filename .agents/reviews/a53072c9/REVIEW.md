---
branch: dm/oct-23-v055jy
commit: a53072c99cb7a3a0716799bb1a681d202cd5ca83
base: 296c44c8582f3d8ae3c1d490667f58584f5118e8
mode: fast
createdAt: 2026-10-23T11:23:56.402Z
isFinalized: true
groups: 140
rules: [bounded-live-state, code-not-in-strings, consistent-file-naming-within-folder, design-tokens-not-raw-spacing-sizing, log-fire-and-forget-rejections, no-impossible-state-handling, no-invented-theme-tokens, no-styling-wrapper-divs, story-for-new-ui-component, structured-logging-not-console]
reviewId: a53072c9
---

_2 error(s), 13 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- a53072c9-1 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-transcription/src/stories/Home.stories.tsx:265
- a53072c9-2 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Home.stories.tsx:289
- a53072c9-3 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-transcription/src/stories/Home.stories.tsx:318
- a53072c9-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/home/FloorPlan.tsx:71
- a53072c9-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Whistle.stories.tsx:259
- a53072c9-6 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-transcription/src/stories/Whistle.stories.tsx:271
- a53072c9-7 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-transcription/src/stories/Whistle.stories.tsx:417
- a53072c9-8 - ignored - code-not-in-strings - packages/plugins/plugin-transcription/src/stories/whistle/capture.ts:18
- a53072c9-9 - ignored - structured-logging-not-console - packages/plugins/plugin-transcription/src/stories/whistle/fixtures.test.ts:45
- a53072c9-10 - resolved - no-impossible-state-handling - packages/plugins/plugin-transcription/src/stories/whistle/fixtures.test.ts:80
- a53072c9-11 - ignored - bounded-live-state - packages/plugins/plugin-transcription/src/stories/whistle/recording.ts:65
- a53072c9-12 - ignored - story-for-new-ui-component - packages/plugins/plugin-transcription/src/stories/whistle/Waveform.tsx:28
- a53072c9-13 - ignored - no-invented-theme-tokens - packages/plugins/plugin-transcription/src/stories/whistle/Waveform.tsx:40
- a53072c9-14 - resolved - log-fire-and-forget-rejections - packages/plugins/plugin-transcription/src/stories/whistle/whistle-worker.ts:127
- a53072c9-15 - resolved - bounded-live-state - packages/plugins/plugin-transcription/src/stories/whistle/whistle-worker.ts:405

## Issues

# WARN a53072c9-1 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-transcription/src/stories/Home.stories.tsx:265`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 265-276 (`<Panel.Root classNames='w-96 dx-base-surface'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-2 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Home.stories.tsx:289`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 289-302 (`<div className='flex flex-col gap-2 p-2'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-3 consistent-file-naming-within-folder `packages/plugins/plugin-transcription/src/stories/Home.stories.tsx:318`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.83. The likeliest place is lines 318-324 (`export const Default: Story = {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-4 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/home/FloorPlan.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 71-82 (`}) => (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-5 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Whistle.stories.tsx:259`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 259-270 (`<ScrollContainer.Root pin>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-6 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-transcription/src/stories/Whistle.stories.tsx:271`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 271-282 (`<span className='shrink-0 w-10 pt-1 text-sm text-description font-mono tabula...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-7 consistent-file-naming-within-folder `packages/plugins/plugin-transcription/src/stories/Whistle.stories.tsx:417`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.82. The likeliest place is lines 417-431 (`const meta = {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-8 code-not-in-strings `packages/plugins/plugin-transcription/src/stories/whistle/capture.ts:18`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.95. The likeliest place is lines 18-29 (`const CAPTURE_WORKLET = `registerProcessor('whistle-capture', class extends A...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-9 structured-logging-not-console `packages/plugins/plugin-transcription/src/stories/whistle/fixtures.test.ts:45`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 45-56 (`const replay = (file: string, reference: string, passMs: number): ReplaySumma...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-10 no-impossible-state-handling `packages/plugins/plugin-transcription/src/stories/whistle/fixtures.test.ts:80`

System One judges this a likely violation of `no-impossible-state-handling` (Fail hard on states the types already exclude), p=0.91. The likeliest place is lines 80-91 (`expect(replay(file ?? '', '', passMs).transcript).toBe('');`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a53072c9-11 bounded-live-state `packages/plugins/plugin-transcription/src/stories/whistle/recording.ts:65`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.91. The likeliest place is lines 65-76 (`this.#bars.push({ peak: this.#peak });`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-12 story-for-new-ui-component `packages/plugins/plugin-transcription/src/stories/whistle/Waveform.tsx:28`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 28-39 (`export const Waveform = ({ recording, classNames }: WaveformProps) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-13 no-invented-theme-tokens `packages/plugins/plugin-transcription/src/stories/whistle/Waveform.tsx:40`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 40-49 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN a53072c9-14 log-fire-and-forget-rejections `packages/plugins/plugin-transcription/src/stories/whistle/whistle-worker.ts:127`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.89. The likeliest place is lines 127-142 (`const fetchCached = async (url: string): Promise<Response> => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR a53072c9-15 bounded-live-state `packages/plugins/plugin-transcription/src/stories/whistle/whistle-worker.ts:405`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 405-416 (`case 'audio': {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `296c44c8582f3d8ae3c1d490667f58584f5118e8`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 15 violations written to fragments, 337 uncertain, 408 clean, 0 unanswered
- left for an agentic reviewer: 82 batch(es)

```text
requests: 439 (180 verdicts re-asked with context the model requested)
estimated input tokens: 2793724
billed input tokens: 2711347 (cost $0.1139)
measured chars per token: 3.09
```
