# Pluggable Channel backends

Date: 2026-06-05
Status: Approved design — pending implementation plan

## Goal

Extend `plugin-thread` so a `Channel` can be served by backends other than the
local ECHO `Feed`. A capability lets plugins contribute backends; for example
`plugin-bluesky` will provide an ATProto-backed channel using its existing
Bluesky auth. A later `plugin-freeq` backend (https://github.com/chad/freeq)
will be an additive third provider on the same contract.

This iteration delivers the **seam only**, with the existing Feed path
refactored to register as the first provider behind the capability
(behavior-preserving). The Bluesky backend lands in a follow-up PR; its shape is
sketched here (Appendix) to validate the contract.

## Decisions (from brainstorming)

1. **Transport replacement**, not sync-into-ECHO. The backend fully owns message
   read + write. The UI is agnostic: it receives a reactive array of messages
   and a send function and does not assume a `feed`.
2. **Open discriminator + provider-defined config object (Ref).** The Channel
   records `backend.kind` plus a `Ref` to a config object whose schema the
   provider owns. The Feed backend becomes "the backend whose config object is a
   `Feed`".
3. **Providers contribute data only**; `plugin-thread` owns a single agnostic
   container that resolves the provider by kind and wires the reactive read +
   send into the shared `Chat` presentational component.
4. **Reactive signal + Effect contract**, framework-agnostic, wrapped by a thin
   `useMessages` hook. No React in the capability (keeps it usable from
   node/workerd/agent contexts).
5. **No data migration.** Existing `feed`-field channels can be reset; the
   schema version bump is not accompanied by a migration.

## A. The `ChannelBackend` capability (registry)

Defined in `plugin-thread` (e.g. `ThreadCapabilities.ChannelBackend`). Providers
contribute entries; the container, the `useMessages` hook, and the send/create
operations consume them via `Capability.getAll`. Provider entry contract:

```ts
type ChannelBackendProvider = {
  /** Stable id, e.g. 'org.dxos.channel.backend.feed'. */
  kind: string;
  /** Shown in the create-form type selector. */
  label: string;
  icon?: string;
  /** The provider's config-object schema (drives the create-form branch + validation). */
  configSchema: Schema.Schema.AnyNoContext;
  /** Build the config ECHO object on channel creation (e.g. Feed.make()). */
  makeConfig: (options: unknown) => Obj.Any;
  /** Reactive read. Returns a reactive readonly Message[] plus a disposer. */
  subscribe: (channel: Channel.Channel) => { messages: ReactiveMessages; dispose: () => void };
  /** Write. */
  send: (channel: Channel.Channel, message: Message.Message) => Effect.Effect<void, unknown, unknown>;
  /** Default: channel carries foreign-key Obj.Meta. */
  readOnly?: (channel: Channel.Channel) => boolean;
};
```

`ReactiveMessages` is "a reactive readonly `Message[]`". The concrete primitive
(DXOS live signal vs. a subscribe-callback) is an open item (§H.1); the hook in
§C adapts whichever is chosen.

## B. Channel schema change (`@dxos/types/Channel.ts`)

Replace `feed: Ref(Feed.Feed)` with an open discriminator + provider-owned
config ref:

```ts
export const Channel = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  backend: Schema.Struct({
    kind: Schema.String,
    config: Ref.Ref(Obj.Any), // points at the provider's config object
  }),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--hash--regular', hue: 'rose' }),
  Type.makeObject(DXN.make('org.dxos.type.channel', '0.2.0')),
);
```

- Bump `org.dxos.type.channel` `0.1.0 → 0.2.0`.
- `Channel.make()` defaults to the Feed backend: `kind: 'feed'`,
  `config: Ref.make(Feed.make())`, so bare `Channel.make({ name })` callers keep
  working. `Obj.setParent(config, channel)` preserved.
- `FeedAnnotation` usage is re-evaluated — it currently marks the Channel as
  feed-bearing; if it no longer applies generically it moves to the Feed
  provider's config or is dropped.
- All call sites reading `channel.feed` (ChannelChat, append-channel-message,
  create-channel) are updated in the same change — no compatibility shim.
- No migration: existing channels are reset.

## C. Read / write wiring (`plugin-thread`)

- New `useMessages(channel)` hook: resolves the provider by `channel.backend.kind`
  from the registry, subscribes, returns a reactive `Message[]`, disposes on
  unmount.
- `ChannelChat` container drops the direct `useQuery(...).from(feed)` and uses
  `useMessages`. `readOnly` = `provider.readOnly?.(channel) ?? (foreign keys present)`.
- `AppendChannelMessage` handler resolves the provider by kind and delegates to
  `provider.send(...)`. The current `Feed.append + createFeedServiceLayer(space.queues)`
  logic moves into the Feed provider's `send`.

## D. Create-channel form (provider-driven)

`CreateObjectEntry` already supports an `inputSchema` (rendered via
react-ui-form) and a `customPanel` escape hatch.

At module activation, assemble the Channel `CreateObjectEntry.inputSchema` from
the registered providers: `{ name?, type: <enum of provider kinds>, …selected
provider config fields }`. react-ui-form renders the type selector and the
selected provider's fields (e.g. the ATProto channel id appears only when ATProto
is chosen). On submit, `CreateChannel` receives `{ name, kind, …options }`, finds
the provider, calls `makeConfig`, and creates the Channel referencing the config
object.

`CreateChannel` operation input gains `kind` + provider options; output
unchanged. Discriminated-union rendering support in react-ui-form is an open
verification item (§H.2); fallback is `customPanel`.

## E. Feed provider (the first consumer)

New module `capabilities/channel-backend-feed.ts` in plugin-thread contributing a
`ChannelBackend` entry:

- `kind: 'feed'`
- `label: 'Feed'`, icon `ph--rows--regular`
- `configSchema: Type.getSchema(Feed.Feed)`
- `makeConfig: () => Feed.make()`
- `subscribe`: reactive query of `Message` from the feed (the current
  `Query.select(Filter.type(Message)).from(feed)`)
- `send`: the existing append logic (`Feed.append` with
  `createFeedServiceLayer(space.queues)`)
- `readOnly`: foreign-key `Obj.Meta` present

Registered in `ThreadPlugin`.

## F. Testing

- Unit-test the Feed provider's `send`/`subscribe` (vitest, near module).
- A registry/container test driven by an in-memory fake provider — validates
  provider resolution, the `useMessages` wrapper, and create-form assembly
  without ECHO.
- Regression: existing channel send/read behavior preserved through the Feed
  provider.

## G. Appendix — Bluesky provider sketch (validates the contract; built later)

Not built this iteration. Sketched to confirm the §A contract generalizes:

- `kind: 'atproto'`
- `configSchema: AtprotoChannelConfig { handle/did, feed uri }`
- `makeConfig`: builds the config object from the create-form options
- `subscribe`: maps an atproto timeline subscription/poll to `Message[]`
  (non-ECHO reactive source)
- `send`: posts via plugin-bluesky's existing atproto OAuth session
- `readOnly`: false once authed
- Foreign senders use `Actor { name: handle }` (Actor already carries
  `name`/`email`)

Exercises: foreign-schema config ref, non-ECHO reactive read, async authed send,
foreign sender.

## Roadmap (follow-up phases, out of scope for this spec)

This spec covers Phase 1 only. Subsequent phases get their own spec → plan →
implementation cycle:

- **Phase 2 — Bluesky backend.** `plugin-bluesky` contributes an `atproto`
  `ChannelBackend` (Appendix G), wired end-to-end with foreign-sender handling.
- **Phase 3 — UI component rewrite.** Rewrite the channel/thread UI components,
  including `@dxos/react-ui-thread` (the `Message`/`Thread` primitives), against
  the agnostic message contract established here.
- **Phase 4 — Extract CommentsCompanion.** Factor the `CommentsCompanion`
  container (currently in `plugin-thread`) out into its own plugin.
- **Phase 5 — freeq backend.** Additive third `ChannelBackend` provider
  (https://github.com/chad/freeq), also using Bluesky auth.

## H. Open items / risks

1. **Reactive primitive** for `subscribe` (DXOS live signal vs. subscribe-callback)
   — pin in the implementation plan, aligned with how `useQuery` exposes
   reactivity.
2. **react-ui-form discriminated-union** support for the dynamic create form;
   fallback to `customPanel`.
3. **Foreign sender** representation — deferred to the Bluesky spec.
