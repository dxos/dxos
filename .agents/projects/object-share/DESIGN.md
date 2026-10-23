# Object share — design

Share one Composer object (a document, a sheet, a board…) the way Google Docs shares a file: a
**Share** button on every object opens a dialog, **Copy link** produces a URL, and whoever opens the
URL lands on that object — joining the space in the background if they are not a member, and
creating an identity on the spot if the browser has none. The guest replicates **only the shared
object and the objects it needs**, not the whole space.

Status: v1 implemented on `claude/stoic-pascal-eestng`. Owner: Composer. Project ledger:
`TASKS.md` beside this file and the "Object share" project in the DXOS Composer space.

## 1. User story

1. Alice has a space with ten documents. Document _A_ links to document _B_ (`[B](echo:///<id>)`).
2. Alice opens _A_, clicks **Share**, leaves General access on _Anyone with the link_, clicks
   **Copy link**.
3. Bob opens the link in a fresh browser. Composer boots, creates Bob's identity without showing the
   welcome screen, joins Alice's space through EDGE, turns on the Markdown plugin, and opens _A_.
4. Bob's device holds _A_, _B_ (A links to it), and the space's properties — never the other eight
   documents.

## 2. The dialog

Built from `@dxos/react-ui` primitives (`Dialog`, `Avatar`, `Select`, `Input`, `Button`, `Icon`)
and registered as a plugin-space dialog surface (`SHARE_OBJECT_DIALOG`).

```
┌──────────────────────────────────────────────────────┐
│ Share "Roadmap"                                    ✕ │
│                                                      │
│ People with access                                   │
│  (A) Alice (you)                              Owner  │
│  (C) Carol                                   Editor  │
│                                                      │
│ General access                                       │
│  (🌐)  [Anyone with the link ▾]           [Editor ▾] │
│        Anyone with the link can open this object.    │
│                                                      │
│ ▸ Shared with the link: Roadmap, Spec (2 objects)    │
│   Plugins: Markdown                                  │
│                                                      │
│ [https://composer.space/w/…?share=…            ]     │
│ [🔗 Copy link]                              [Done]   │
└──────────────────────────────────────────────────────┘
```

- **People with access** — the space's members (avatar, name, role). Space membership is the only
  access list ECHO has, so this is what "people with access" means today.
- **General access** — `Restricted` (members only: a plain object link, no invitation) or
  `Anyone with the link` (the link carries an invitation). The role select maps Editor → `EDITOR`
  and Viewer → `READER` on the admitted member credential (see §8 on enforcement).
- **Copy link** — creates the invitation on first click (never on open, since every invitation
  writes a credential to the control feed), shows the URL in a read-only field, and copies it. The
  link is cached per object for the dialog's lifetime, so a second click copies the same URL.
- Opened from the **Share** action that every ECHO object node carries (plank menu, navtree menu,
  and a `NavbarEnd` button in the plank heading), keyboard-free.

## 3. The link

The object's existing shareable path plus one query parameter:

```
https://composer.space/w/<spaceId>/db/<typeSlug>+<objectId>?share=<payload>
```

The query parameter is `SpaceOperation.SHARE_PARAM`, which plugin-onboarding also reads (§6). The path is what the
existing **Copy link** action already produces
(`UrlResolution.getShareableLinkPath`), so a member who opens it lands on the object through the
normal URL projection with no extra work. `payload` is `base64url(deflate-raw(JSON))` of:

```ts
type SharePayload = {
  v: 1;
  spaceId: SpaceId;
  objectId: ObjectId; // The target.
  typeSlug: string; // The type's graph path segment, so the guest can open the object before its type registers.
  invitation?: string; // InvitationEncoder code; absent for Restricted links.
  plugins: string[]; // Plugin ids that render the scope's types.
  objects: ObjectId[]; // The scope (§4): the target first.
};
```

A query parameter rather than a fragment, matching `spaceInvitationCode`: the deck's URL handler
and the Tauri deep-link path read query parameters, and the invitation is already a bearer secret
in today's invitation URLs. Moving both to the fragment (never sent to a server or logged by
Cloudflare) is a follow-up (§9).

## 4. The scope — which objects the link carries

`collectShareScope(object)` walks the ECHO graph from the target:

1. Every reference in the object's data (`{ '/': 'echo:…' }` anywhere in `Obj.toJSON`) — this is
   how a Document reaches its `Text`, a board its cards, a table its view.
2. Every ECHO URI inside a string property (`echo:///<id>`, `echo://<space>/<id>`,
   `dxn:echo:@:<id>`) — this is how a markdown document "addresses" another one.
3. Repeat for each newly reached object, breadth-first, up to `MAX_SCOPE_OBJECTS` (64), staying
   inside the space.
4. Add the space's properties object: `SpaceProxy` waits for it before the space reports ready, so
   a guest without it never opens the space.

The root collection is deliberately **not** in scope: it would list every object in the space as
unloadable refs. The guest's navtree shows the space's objects grouped by type, which a query over
the local, in-scope documents fills.

Required plugins: for each typename in the scope, the plugin whose schema module registers it
(the lookup `SupportCompanion` already does over `AppCapabilities.Schema` modules), minus core
plugins, which are always on.

## 5. The invitation

`SpaceOperation.ShareObject` creates a **delegated, multi-use** space invitation with
`authMethod: KNOWN_PUBLIC_KEY` (what `GetShareLink` and "invite many" already use), the chosen role,
and `target` set to the object's URI. Delegated means the credential is written to the space's
control feed and EDGE redeems it with no member online
(`POST /spaces/:spaceId/join`, `db-service/src/worker/api-handler/invitation.ts`); any member
device with management permission also re-hosts it peer-to-peer. The guest keypair travels inside
the code, so the link itself is the secret, exactly like today's invite-many link.

## 6. Opening the link

A new plugin-space `NavigationHandler` (`share-link-handler`) reads `?share=`, removes it from the
address bar, and branches:

| Recipient                    | What happens                                                                                                                                                                                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) already a member**     | Enables any missing plugins, extends the space's sync scope if the member is itself a partial guest (`space.internal.extendSyncScope`, a no-op for full members), and returns — URL projection opens the object from the path.                                                                                                            |
| **(b) identity, not member** | Enables the plugins, then `client.spaces.join(invitation, { syncScope: { objectIds } })` without a dialog. The handler awaits the join (bounded) so projection resolves the object path as soon as the space is ready; if the join outlives the bound it carries on detached and opens the object when it lands (`LayoutOperation.Open`). |
| **(c) no identity**          | plugin-onboarding sees `?share=` and creates the identity in place — no welcome screen, no help tour — then (b). The handler waits for the identity rather than creating one, so the two never race to create two.                                                                                                                        |

## 7. Partial sync — the client-side guard

The guest's own client refuses every document outside the scope. Nothing else does (§8).

**State.** `SpaceMetadata.sync_scope` (`dxos.echo.metadata.SpaceSyncScope { repeated string
object_ids }`), persisted with the rest of the metadata blob. Absent means "the whole space" —
every existing space and every full member is unaffected.

**Plumbing.** `InvitationsService.acceptInvitation` takes an optional `syncScope`; the invitations
manager passes it to the space invitation protocol, whose `accept` hands it to
`DataSpaceManager.acceptSpace`, which writes it into the new space's metadata. `_constructSpace`
applies a stored scope to the ECHO host before the data pipeline starts, so the very first
replication round is already filtered. `SpacesService.updateSpace` takes `extendSyncScope` for case
(a).

**Enforcement** (`echo-host`). `EchoHost.setSpaceSyncScope(spaceId, objectIds)` stores the scope in
`SpaceStateManager`. Whenever the space's directory changes, the document-list check splits the
directory's documents into:

- **in scope** — the directory itself, the space root and credentials documents, `links[id]` and the
  branch documents of every object id in the scope, and every document this host created (the
  guest's own writes);
- **out of scope** — every other linked or branch document.

The in-scope list becomes the space's collection (what is advertised, and what EDGE diffs are
intersected with). Every out-of-scope document is quarantined with the new reason `'out-of-scope'`,
**before** the collection is published, so no sync round can see it first. The quarantine is the
existing deny-gate on every path — storage load, `acquireDoc`/`loadDoc`, collection-sync requests
(mesh diffs are symmetric, so this is the one that stops a member peer offering everything),
Subduction `authorizePut` (an unsolicited push), `authorizeFetch` (serving it on), and collection
advertisement. Unlike `'load-failed'`, an out-of-scope quarantine never triggers retirement (which
would rewrite the shared directory for everyone), and it is released when the scope grows.

Effect on the app: an object outside the scope never loads, so queries (indexed from local
documents only) never return it and a `Ref` to it stays unresolved.

## 8. Security — read this before relying on it

**EDGE does not guard documents.** The guest is admitted as a full `SpaceMember`. EDGE's Subduction
Durable Object serves every tree in the space to any member connection (it runs with Subduction's
allow-all policy), and its collection-state replies list every document id and head. Peer members
serve whatever the guest asks for. The scope is honoured only because the guest's _own_ client
chooses to ask for nothing else. A modified client — or the same identity on another device, which
`CrossDeviceSpaceSynchronizer` joins to the full space — obtains every document in the space.

So in v1 a share link is **"invite to the space, show one object"**, not a capability limited to
that object. The dialog says "Anyone with the link can open this object"; the design must not be
sold as access control until the server side exists. Related: `READER` is recorded on the member
credential but ECHO does not enforce it on document writes.

What closing the gap needs (tracked as tasks):

1. EDGE: a per-member document allowlist (the scope, signed into the delegation credential so EDGE
   can verify it) enforced in the Subduction DO's `authorizeFetch`/`filterAuthorizedFetch`, and
   collection replies filtered to it.
2. Peers: `MeshEchoReplicator.shouldAdvertise` consulting the same credential-carried scope.
3. Credential: carry the scope in the delegated invitation credential so every enforcement point
   reads one signed source of truth, and so other devices of the guest inherit it.

## 9. Limitations and follow-ups

- The scope is fixed when the link is made. A child the owner adds later (a new comment thread, an
  embedded sketch) is not visible to the guest until the scope is extended. Follow-up: grow the
  scope on the host by following references out of in-scope documents.
- Objects the guest creates stay in scope only while this host remembers creating them
  (`AutomergeHost` keeps that set in memory); after a reload they fall out of scope until extended.
- Other devices of the guest replicate the whole space (§8).
- Move `?share=` (and `spaceInvitationCode`) into the URL fragment.
- Revocation: cancelling the delegated invitation stops new joins; it does not remove members who
  already joined. The dialog has no "stop sharing" yet.

## 10. Decision log

| #   | Decision                                                                   | Why                                                                                                                                                  |
| --- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Lives in plugin-space, not a new plugin.                                   | plugin-space already owns object actions, invitations, the members panel and URL handlers, and it is a core plugin, so every object gets the action. |
| D2  | Link = the object's shareable path + `?share=`.                            | Members open it with no new code path; the payload only matters to non-members.                                                                      |
| D3  | Scope enforcement reuses the quarantine gate with a new reason.            | It already covers load, request, accept, serve and advertise; a parallel gate would duplicate seven call sites and drift.                            |
| D4  | Scope persisted in `SpaceMetadata`, not SQL.                               | The metadata store is one protobuf blob, so a new optional field needs no migration; `edge_replication` is the precedent.                            |
| D5  | Scope travels in `AcceptInvitationRequest`, not in the `Invitation` proto. | It is the guest's local choice, not part of what the host signs or EDGE reads; an Effect-schema field needs no codegen on the wire.                  |
| D6  | Root collection excluded from the scope; space properties included.        | Properties gate `SpaceProxy` readiness; the root collection would leak the object list as dangling refs.                                             |
| D7  | Markdown `echo:` links count as edges.                                     | "A document that addresses another one" must open with its link working; without it the guest sees a dead link.                                      |
| D8  | KNOWN_PUBLIC_KEY + multi-use + delegated, like invite-many.                | Proven EDGE path in production; NONE works too but has no extra benefit and is less exercised.                                                       |
| D9  | Onboarding owns identity creation for share links.                         | Onboarding and the handler would otherwise race to create two identities on a fresh browser.                                                         |

## 11. Test plan

- `share-payload.test.ts` — encode/decode round trip, version check, garbage rejected.
- `share-scope.test.ts` — references, markdown links, cycles, the cap, foreign-space links ignored.
- `space-state-manager` / `echo-host` test — a scoped space's collection holds only in-scope
  documents and out-of-scope ones are quarantined with `'out-of-scope'`; extending releases them.
- Autocue two-peer demo (`packages/apps/composer-app/autocue/object-share.mjs`, plugin-space
  `PLUGIN.mdl` QA test): ten documents, share one that links another, a fresh browser opens the
  link and sees the document.
