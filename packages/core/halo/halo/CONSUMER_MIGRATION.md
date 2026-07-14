# Consumer Migration — `@dxos/client` HALO → `@dxos/halo` services

How to move Composer (`packages/apps/composer-app`) and the plugins
(`packages/plugins/*`) off direct `@dxos/client` HALO access and onto the
`@dxos/halo` Effect services (backed by `@dxos/halo-adapter-client`).

Companion to [API_AUDIT.md](./API_AUDIT.md) (what the consumers use today) and
[MIGRATION.md](./MIGRATION.md) (the HALO → Keyhive backend rewrite). This
document is the practical cookbook: the decisive verdict on coverage, then
before→after patterns for the cases the services already handle.

## Verdict

**The new API cannot yet replace `@dxos/client` everywhere in Composer and the
plugins.** The three services (`Identity`, `Space`, `Invitation`) cover the
imperative HALO surface — identity/device lifecycle, space management and
membership, and the invitation state machine — and the `layerClient(client)`
composition root drops in wherever a plugin already holds a `Client`. That is
enough to migrate imperative call sites (operation handlers, CLI commands,
managers, import scripts).

It is **not** enough to migrate the codebase wholesale. Four gaps remain, each
with an agreed disposition:

1. **React bindings — reuse the existing layer.** There are ~368 uses of
   `useIdentity` / `useDevices` / `useCredentials` / `useSpaces` / `useSpace` /
   `useMembers` / `useSpaceInvitations` across 163 files. Rather than ship a new
   binding package, `@dxos/react-client`'s existing hooks will be reimplemented
   on top of the HALO services (bridging the `changes` / `memberChanges` /
   `deviceChanges` streams to React state) so component call sites are unchanged.
   Until that rewrite lands, component code stays on `@dxos/react-client`.
2. **ECHO database access — a separate track, by design.** `Space.Info` is a
   plain snapshot, not a live proxy — it has no `.db`, `.crud`, `.properties`,
   or `.internal`. The heavy `space.db.*` / `space.internal.*` usage is ECHO,
   not HALO, and belongs on the `@dxos/echo` `Database` service keyed by
   `SpaceId`. This is not folded into HALO. See API_AUDIT.md §3.6.
3. **Deferred verbs — planned, not yet defined.** Credentials
   (`halo.queryCredentials` / `writeCredentials`), recovery-credential
   _creation_ (`createRecoveryCredential` / `requestRecoveryChallenge`), EDGE
   `createEdgeIdentity` / attestation, and device _update_ will be added as
   `Identity`-service verbs in a follow-up. Consumers of those stay on the
   client until then.
4. **Space create/lifecycle gaps — mostly closed.** `Space.create` now accepts
   `{ name?, tags?, membershipPolicy? }`, and EDGE replication is toggled with
   `Space.setEdgeReplication(id, setting)`. `migrate` is intentionally left out.
   `State` remains the consumer-relevant subset (`inactive` / `closed` /
   `ready`), not the full `SpaceState` enum.

So: migrate imperative HALO call sites now; leave React components and ECHO
access on `@dxos/client` until the binding rewrite and the ECHO `Database`
service land, and the deferred verbs (§3) until they are defined. The rest of
this doc covers the cases that _can_ move.

## Composition root

Every plugin already obtains its `Client` from the
`ClientCapabilities.Client` capability provided by `plugin-client` — a single
injection point. Build the HALO layer once from that client and provide it to
any effect:

```ts
import { layerClient } from '@dxos/halo-adapter-client';
import { Identity, Space } from '@dxos/halo';

const halo = layerClient(client); // Layer<Identity.Service | Space.Service | Invitation.Service>

const program = Effect.gen(function* () {
  const identity = yield* Identity.current;
  const spaces = yield* Space.list;
  // ...
});

await Effect.runPromise(program.pipe(Effect.provide(halo)));
```

`layerClient` is the seam that replaces direct `@dxos/client` access for HALO
concerns. The backend behind it (legacy client, EDGE shim, or Keyhive) can swap
without touching consumers.

## Patterns

Each pattern shows the current `@dxos/client` call and its `@dxos/halo`
equivalent. All effects require the corresponding service in `R`; provide
`layerClient(client)`.

### Identity — read / gate

```ts
// Before
const identity = client.halo.identity.get();
if (!identity) return;
const did = identity.did;

// After
const maybe = yield * Identity.current; // Option<Identity.Info>
if (Option.isNone(maybe)) return;
const did = maybe.value.did;
```

Field reads change shape: `Identity.Info` is `{ did, displayName? }`.
`identityKey` / `spaceKey` (credential plumbing) are intentionally dropped in
favor of the DID.

### Identity — subscribe

```ts
// Before
const sub = client.halo.identity.subscribe((identity) => onChange(identity));
// ... sub.unsubscribe();

// After — reactive stream, completes when the scope closes
yield * Stream.runForEach(Identity.changes, (maybe) => Effect.sync(() => onChange(maybe)));
```

### Identity — create / update profile

```ts
// Before
await client.halo.createIdentity({ displayName: 'Alice' });
await client.halo.updateProfile({ displayName: 'Alice B.' });

// After
const info = yield * Identity.create({ displayName: 'Alice', deviceLabel: 'laptop' });
yield * Identity.updateProfile({ displayName: 'Alice B.' });
```

### Devices

```ts
// Before
const devices = client.halo.devices.get();

// After
const devices = yield * Identity.devices; // readonly DeviceInfo[]  ({ key, kind?, label?, current })
// reactive: Identity.deviceChanges
```

`DeviceInfo.kind` is the inlined `Identity.DeviceKind` literal
(`'unknown' | 'browser' | 'native' | 'mobile' | 'agent' | 'agent-managed'`),
replacing the protobuf `DeviceType` enum. **Device _update_ is not defined** —
stay on the client for that.

### Spaces — list / get

```ts
// Before
const spaces = client.spaces.get();
const space = getSpace(object) ?? client.spaces.get(spaceId);

// After
const spaces = yield * Space.list; // readonly Space.Info[]
const maybe = yield * Space.get(spaceId); // Option<Space.Info>
// reactive: Space.changes
```

`Space.Info` is `{ id, name?, state }` — a snapshot. For `space.db` / query /
properties, use `@dxos/echo` keyed by `Space.Info.id`; do not expect a proxy.

### Spaces — create

```ts
// Before
const space = await client.spaces.create({ name: 'Project' }, { tags: ['team'], membershipPolicy });
await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);

// After
const info = yield * Space.create({ name: 'Project', tags: ['team'], membershipPolicy: 'invite' });
yield * Space.setEdgeReplication(info.id, 'enabled');
```

`membershipPolicy` is `'invite' | 'locked'` and `setEdgeReplication` takes
`'disabled' | 'enabled'` (the adapter maps the legacy protobuf enums). **Gap:**
`migrate` is intentionally not modeled — call sites needing it stay on the
client.

### Spaces — wait ready

```ts
// Before
await space.waitUntilReady();

// After
yield * Space.waitReady(spaceId);
```

### Members

```ts
// Before
const members = space.members.get(); // SpaceMember[]

// After
const members = yield * Space.members(spaceId); // readonly Space.Member[]  ({ did?, role, online })
// reactive: Space.memberChanges(spaceId)
```

`Member.role` is the Keyhive-aligned `Space.Access`
(`'pull' | 'read' | 'edit' | 'admin'`); the adapter maps the legacy
`SpaceMember.Role` enum. `updateMemberRole(id, did, role)` and
`removeMember(id, did)` are defined (removal re-keys the space and does not
converge in the in-memory test harness — see the e2e NOTE).

### Export / import

```ts
// Before — via client space handle
// After
const archive = yield* Space.exportSpace(spaceId); // { filename, contents }
const info = yield* Space.importSpace(archive, { tags: [...] });
```

### Invitations — share (host)

Initiation lives on `Identity` / `Space` (not on `Invitation`); the returned
`Flow` is then driven through the `Invitation` verbs.

```ts
// Before
const observable = space.share({ authMethod: Invitation.AuthMethod.NONE });
observable.subscribe((invitation) => {
  /* switch on invitation.state */
});
const code = InvitationEncoder.encode(observable.get());

// After
const flow = yield * Space.share(spaceId, { authMethod: 'none' }); // Invitation.Flow
const code = yield * Invitation.code(flow);
yield *
  Stream.runForEach(Invitation.events(flow), (event) =>
    Effect.sync(() => {
      // event._tag: 'connecting' | 'connected' | 'readyForAuthentication'
      //           | 'authenticating' | 'success' | 'cancelled' | 'error'
    }),
  );
```

Device invitations are identical with `Identity.share(options?)`.

### Invitations — join (guest) + authenticate

```ts
// Before
const observable = client.spaces.join(InvitationEncoder.decode(code));
observable.subscribe(/* ... */);
await observable.authenticate(authCode);

// After
const flow = yield * Space.join(code); // decodes internally
yield *
  Stream.runForEach(Invitation.events(flow), (event) =>
    event._tag === 'readyForAuthentication' ? Invitation.authenticate(flow, authCode) : Effect.void,
  );
```

`Identity.join(code)` is the device equivalent. `Invitation.cancel(flow)` aborts.

### Invitations — observe active flows

```ts
// Before
const invitations = space.invitations.get();

// After — scope selects device vs space
const flows = yield * Invitation.active({ spaceId }); // or { device: true }
// reactive: Invitation.activeChanges({ spaceId })
```

## What stays on `@dxos/client` (for now)

| Area                                                                                                       | Reason                                | Unblocks when                                                       |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `useIdentity` / `useDevices` / `useSpaces` / `useSpace` / `useMembers` / `useSpaceInvitations` (~368 uses) | Services are Effect/Stream, not hooks | `@dxos/react-client` hooks are reimplemented over the HALO services |
| `space.db` / `space.crud` / `space.properties` / `space.internal.*` (except edge replication)              | ECHO, not HALO                        | migrate to the `@dxos/echo` `Database` service keyed by `SpaceId`   |
| `halo.queryCredentials` / `writeCredentials`; recovery-credential _creation_                               | deferred verb                         | credential + recovery verbs added to `Identity`                     |
| `createEdgeIdentity` / EDGE attestation                                                                    | deferred verb                         | EDGE verbs added to `Identity`                                      |
| device _update_                                                                                            | deferred verb                         | `Identity` device-update verb added                                 |
| `space.internal.migrate`                                                                                   | intentionally out of scope            | (revisit if needed)                                                 |
| full `SpaceState` enum                                                                                     | `Space.State` is the consumer subset  | (by design)                                                         |
