# Composer UI — Session Memory

Session-logged rules for agents. Append a dated section per session (newest first): `## YYYY-MM-DD — <plugin(s)>` + terse bullets. One rule per bullet; name the file/symbol/idiom. Promote durable rules into `SKILL.md`.

---

## 2026-07-08 — plugin-inbox (Row.Attachments)

- `moon run <pkg>:build`'s `compile` task hashes the `production` file group (`.moon/tasks/all.yml`), which explicitly excludes `**/*.stories.tsx` — editing only a story file gets a cache hit and `tsc` never reruns, silently skipping typecheck. Verify story-only edits with `npx tsc -p packages/plugins/<pkg>/tsconfig.json --noEmit` directly, or by actually loading the story.
- To verify a new story renders (not just compiles) when the `t3-code` preview MCP tool is unavailable/unauthorized: run storybook from the worktree (`moon run storybook-react:serve -- --port <free-port> --no-open --ci`), then drive it with Playwright resolved from a package that already depends on it (e.g. `packages/e2e/blade-runner` — `playwright` isn't hoisted to workspace root `node_modules`), navigating to `http://localhost:<port>/iframe.html?id=<story-id>&viewMode=story`. Capture `page.on('console'/'pageerror')` — a blank screenshot with no logged error usually means the check ran too early (add `waitForTimeout` after `load`/`networkidle`), not a real failure.
- Building two synthetic items in a story that both `Ref.make()` the _same_ underlying object gives them the same `.uri` — if the component keys list items by ref uri (e.g. an attachments/tags row), React throws a duplicate-key warning even though the UI still renders. Use two distinct stand-in objects.
- Small non-clickable icon+label chip row (e.g. attachment list) reuses the `RowTags`-style `Card.Row > Card.Block(Icon) > flex-wrap chips` shape from `plugin-inbox/src/components/Row/Row.tsx`, rendering each chip as `<Tag hue='neutral'>` (not a bespoke pill) — `Tag` has no icon slot, so put `<Icon size={3} />` + text as `Tag`'s children with `classNames='inline-flex items-center gap-1'` (tailwind-merge resolves the `inline-block`→`inline-flex` override).
