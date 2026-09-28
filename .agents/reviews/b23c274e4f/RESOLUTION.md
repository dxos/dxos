# Resolution — b23c274e4f

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- b23c274e4f-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:381
- b23c274e4f-2 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:81
- b23c274e4f-3 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:129
- b23c274e4f-4 - resolved - no-casts - packages/plugins/plugin-computer/src/templates/composer-plugin.test.ts:42
- b23c274e4f-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:75
- b23c274e4f-6 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:171
- b23c274e4f-7 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:224
- b23c274e4f-8 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:36
- b23c274e4f-9 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:499

Notes:

- 1, 2, 9: lines this PR does not change (ChatContent, ChatArticle's effect, TaskList.GroupLabel); out of scope.
- 3: the activity/status cells are `Flex` now (this PR touched the first for `min-w-0`).
- 4: the template test's non-null assertions are replaced by a guard and optional chaining.
- 5, 6, 7: `Logo.stories.tsx` is not changed by this PR; the diff comes from main moving past the review base.
- 8: `Countdown`'s one effect mounts and aborts an imperative DOM widget; it is the component's whole behaviour,
  and a hook around it would be the component again.
