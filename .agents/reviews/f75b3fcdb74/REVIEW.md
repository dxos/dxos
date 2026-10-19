---
branch: claude/react-ui-next-design-4db6eb
commit: f75b3fcdb74088e543826b7f45cb68d570eee73c
base: f4ea3e5a4952efa7f6bfbce8878efd9709f1b4ac
mode: fast
createdAt: 2026-10-04T10:34:51.341Z
isFinalized: true
groups: 99
rules: [effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, no-casts, no-invented-theme-tokens, no-styling-wrapper-divs]
reviewId: f75b3fcdb74
---

_1 error(s), 8 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f75b3fcdb74-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:132
- f75b3fcdb74-2 - ignored - no-casts - packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:806
- f75b3fcdb74-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/incident/project.ts:34
- f75b3fcdb74-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/stockfish/project.ts:58
- f75b3fcdb74-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/weather/project.ts:48
- f75b3fcdb74-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/project.ts:44
- f75b3fcdb74-7 - ignored - no-invented-theme-tokens - packages/ui/react-ui-components/src/components/Spinner/PulseSpinner.tsx:241
- f75b3fcdb74-8 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/components/Outline/Outline.stories.tsx:31
- f75b3fcdb74-9 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:161

## Issues

# WARN f75b3fcdb74-1 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:132`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 132-143 (`)}`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f75b3fcdb74-2 no-casts `packages/plugins/plugin-debug/src/components/SpaceGenerator/presets.ts:806`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 806-822 (`const attachTrigger = (functionTrigger: Trigger.Trigger | undefined, computeM...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN f75b3fcdb74-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/incident/project.ts:34`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 34-45 (`export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = S...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f75b3fcdb74-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/stockfish/project.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 58-69 (`export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = S...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f75b3fcdb74-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/weather/project.ts:48`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 48-59 (`export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = S...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f75b3fcdb74-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/project.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 44-55 (`export const ProjectPhase: SampleSpace.Phase<ProjectResult, ProjectInput> = S...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN f75b3fcdb74-7 no-invented-theme-tokens `packages/ui/react-ui-components/src/components/Spinner/PulseSpinner.tsx:241`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.92. The likeliest place is lines 241-248 (`const COLORS: Record<ActivityState, string> = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f75b3fcdb74-8 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/components/Outline/Outline.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 31-42 (`const DefaultStory = ({ markers, ...props }: OutlineProps) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN f75b3fcdb74-9 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:161`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 161-172 (`useEffect(() => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `f4ea3e5a4952efa7f6bfbce8878efd9709f1b4ac`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 134 uncertain, 612 clean, 0 unanswered
- left for an agentic reviewer: 51 batch(es)

```text
requests: 338 (83 verdicts re-asked with context the model requested)
estimated input tokens: 2415987
billed input tokens: 2293019 (cost $0.0963)
measured chars per token: 3.16
```
