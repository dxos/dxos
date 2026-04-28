# plugin-trello — design notes

This doc proposes the evolution of `plugin-trello` toward the **headless mapper +
generic Sync object** shape that @richburdon raised on PR #11018. It is the
sequel to the current PR's scope.

## Goals

1. **Plugin-trello becomes a thin Trello-API → Composer-types mapper.** No
   board-shaped containers, no scheduler, no orchestration logic. Just
   `fetch(...)`, `mapToCard(...)`, `mapToBoard(...)`.
2. **Composer's existing Kanban renders Trello boards.** No custom
   `TrelloArticle`. The board-level container we ship today (already removed in
   commit `88d5a18`) was a pre-Kanban placeholder.
3. **A generic `Sync` type lives outside plugin-trello.** It carries the
   endpoint, the bound `Kanban` ref, the `AccessToken` ref, and the cadence
   metadata. Trello is the first consumer; Linear (#11027) and GitHub (#11024)
   should fit the same shape.

## Reference: plugin-inbox / plugin-mailbox

The pattern is already in the codebase:

- `GoogleCredentials.fromMailbox(mailboxRef)` — `Layer.effect` resolves the
  OAuth tokens stored on the mailbox's `AccessToken` ref into a
  `GoogleCredentials` Service.
- "Generic Google API requesters" — pure HTTP/SDK callers that take the
  `GoogleCredentials` service and return raw payloads.
- "Mappers" — turn raw Google payloads into Composer `Message` and `Event`
  ECHO objects.

`plugin-trello` already has the analogue for the credential layer
(`TrelloCredentials.fromBoard` in `services/trello-credentials.ts`). The
mapper layer exists today inside `operations/sync-board.ts` and
`operations/trello-api.ts`. The next refactor pulls those apart cleanly and
deletes the residual UI.

## Proposed shape

```ts
// packages/plugins/plugin-sync/src/types/Sync.ts (NEW, in a future PR)
export const Sync = Schema.Struct({
  endpoint: Schema.Literal('trello.com', 'linear.app', 'github.com', /* … */),
  kanban: Ref.Ref(Kanban.Kanban),                    // the rendered view
  accessToken: Ref.Ref(AccessToken.AccessToken),
  pollIntervalMs: Schema.optional(Schema.Number),
  lastSyncAt: Schema.optional(Schema.String),
  lastSyncError: Schema.optional(Schema.String),
}).pipe(
  Type.object({ typename: 'org.dxos.type.sync', version: '0.1.0' }),
);
```

`plugin-trello/types/Trello.ts` keeps `TrelloBoard` and `TrelloCard`, but
`TrelloBoard.kanbanId` and `TrelloBoard.accessToken` move onto the new `Sync`
object. `TrelloBoard` becomes a thin "what the remote API returned about this
board" type.

`plugin-trello/operations` becomes:
- `mapBoard(remoteBoard) → TrelloBoard`
- `mapCard(remoteCard) → TrelloCard`
- (no scheduling, no Kanban creation, no UI)

A future `plugin-sync` (or core `plugin-automation` extension) owns:
- `SyncTrigger` — runs `mapBoard`/`mapCard` for each `Sync` whose
  `pollIntervalMs` has elapsed.
- `SyncManually` — operation a UI button binds to.
- `BindSyncToKanban` — initial setup that creates the Kanban view from a
  Sync and links them.

## Tests

- A mocked Trello fetcher (`trello-api.test.ts`) lets `mapBoard`/`mapCard` be
  tested without a network. The mock returns canned `boardRes`, `listsRes`,
  `cardsRes` payloads and the test asserts the resulting ECHO objects.
- A higher-level `SyncTrigger` test exercises the end-to-end path with a
  mocked `Sync` row, a mocked endpoint, and asserts the Kanban view ends up
  populated. (Requires the `plugin-sync` skeleton; out of scope for this PR.)

## Why split now?

This PR is already large (initial bring-up of the plugin + several review
rounds). Splitting the `Sync` extraction into a follow-up keeps the diff
auditable and avoids landing a second un-reviewed plugin (`plugin-sync`) in
the same change. The mapper code in this PR is structured so the refactor is
mechanical: the operation and credentials layer move out, the types stay.

## What's in this PR

- `TrelloCard` `card--content` surface (resolves @wittjosiah's renderer
  comment): plugin-kanban auto-discovers Trello card rendering.
- Removal of dead `TrelloArticle` (resolves @wittjosiah's "duplicate purpose"
  comment): Kanban is the only board view.
- `SyncBoard` operation owns the entire pipeline; the `TrelloCardArticle`
  side-panel just dispatches it (resolves @richburdon's "sync logic should
  be in an op" comment).
- `TrelloCredentials.fromBoard` Effect Layer mirrors `GoogleCredentials.fromMailbox`.
- `Obj.Meta.keys` is the dedup primitive; reconciliation is scoped to the
  syncing board.
- `PLUGIN.mdl` spec.
- Registered with `composer-app` under Labs.

## What's deferred (tracked in PLUGIN.mdl roadmap)

- Generic `Sync` object + extraction into `plugin-sync` (F-4).
- Two-way Labels↔Tags mapping (F-5; cross-cutting, blocks on Tag ontology).
- TrelloCardArticle migration to `@dxos/react-ui-form` Form component (F-6;
  needs a read-only field annotation since some Trello fields are
  display-only locally).
