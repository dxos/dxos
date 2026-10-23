# object-share — Tasks

_Resume: v1 in progress on `claude/stoic-pascal-eestng`. Design in [`DESIGN.md`](./DESIGN.md); the space-side
ledger is the "Object share" project in the DXOS Composer space._

## M1: Design

- [x] Research invitations, deep links, replication, plugin enablement (DESIGN.md §3–§7).
- [x] Write DESIGN.md and register the project.

## M2: Partial sync (client-services / echo-host)

- [ ] `SpaceMetadata.sync_scope` proto field and metadata-store accessors.
- [ ] `syncScope` on `AcceptInvitationRequest`, threaded to `acceptSpace`.
- [ ] `EchoHost.setSpaceSyncScope`: scoped collection + `'out-of-scope'` quarantine, released on extend.
- [ ] `SpacesService.updateSpace({ extendSyncScope })` + `space.internal.extendSyncScope`.
- [ ] `client.spaces.join(invitation, { syncScope })`.
- [ ] Unit test: scoped space quarantines out-of-scope documents and keeps them out of the collection.

## M3: Sharing (plugin-space)

- [ ] Share payload codec + tests.
- [ ] Scope collection (refs + markdown links + properties) + tests.
- [ ] Required-plugin lookup from schema modules.
- [ ] `SpaceOperation.ShareObject` (delegated invitation + URL).
- [ ] Share dialog (Google-Docs layout) + Share action on every object + navbar button.

## M4: Opening a link

- [ ] `?share=` navigation handler: member / non-member / waits for identity.
- [ ] plugin-onboarding: create identity in place for share links (no welcome).
- [ ] Enable required plugins before projection.

## M5: Demo and landing

- [ ] plugin-space `PLUGIN.mdl` QA test for the flow.
- [ ] Autocue two-peer flow + recorded side-by-side video.
- [ ] Format, lint, typecheck, tests; push.

## Follow-ups (not v1)

- [ ] EDGE per-member document allowlist (DESIGN.md §8).
- [ ] Carry the scope in the delegation credential; mesh peers honour it.
- [ ] Grow the scope on the host by following references.
- [ ] Persist "created by this guest" so own objects survive reload in scope.
- [ ] Move invitation params into the URL fragment.
- [ ] Stop sharing / revoke from the dialog.
