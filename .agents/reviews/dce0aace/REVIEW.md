---
branch: claude/composer-plugin-deepseek-demo-v0t1io
commit: dce0aace2347cf2b662e9457275833adf5bfb411
base: e04f7eec2b8239c4ff8c719d5b4543a4141f53cf
mode: fast
createdAt: 2026-09-27T13:50:54.940Z
isFinalized: true
groups: 101
rules: [no-casts, no-sleep-in-test, story-for-new-ui-component]
reviewId: dce0aace
---

_1 error(s), 2 warning(s)._

# WARN dce0aace-1 story-for-new-ui-component `packages/plugins/plugin-assistant/src/containers/PluginUrlPrompt/PluginUrlPrompt.tsx:31`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 31-42 (`export const PluginUrlPrompt = ({ url, name }: PluginUrlPromptProps) => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN dce0aace-2 no-sleep-in-test `packages/plugins/plugin-computer/src/vite-plugin/shell-middleware.test.ts:75`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.84. The likeliest place is lines 75-86 (`test('kills a script that outruns its timeout, and the group it spawned', asy...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR dce0aace-3 no-casts `packages/sdk/app-framework/src/testing/harness.ts:250`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 250-261 (`}`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.
