# Merge base `t3code/dc4441a7` into `t3code/0a441ff2`

Goal: adopt base's improved bidirectional `usePagination` (+ `.skip()`/`Order.natural(dir)` DSL, `useVirtualizerPagination`) while KEEPING our index-routing for ordered feed queries.

## Conflict resolution plan
- **Keep OURS** (index-routing + retention read path):
  - `echo-client/src/proxy-db/database.ts` (isClientEvaluableFeedQuery + queryContainsOrder → ordered routes to index)
  - `echo-client/src/query/util.ts` (analyzeFeedQuery)
  - `echo-client/src/feed/feed-handle.ts` (retention)
  - `echo-client/src/feed/feed-query-context.ts` (retention + our path)
- **Take BASE (theirs)**:
  - `echo-react/src/usePagination.ts` (bidirectional hook)
  - `echo/feed/src/feed-store.ts` (transport reverse/before cursor) — verify ours had nothing critical
  - `echo-host/src/db-host/feed-service.test.ts`
- **Reconcile manually** (base hook API + our ordered query/logic):
  - `plugin-inbox/.../MailboxArticle.tsx`
  - `plugin-inbox/.../MessageStack.tsx`
- **Regenerate**: `pnpm-lock.yaml` (checkout theirs → `pnpm install`)

## Verify post-merge
- `Order.natural('desc')` (function) and `.skip()` exist in `@dxos/echo`.
- build echo-react, echo-client, plugin-inbox; run tests.
