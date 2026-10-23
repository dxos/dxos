# object-share — Tasks

_Resume: v1 in progress on `claude/stoic-pascal-eestng`. Design in [`DESIGN.md`](./DESIGN.md); the space-side
ledger is the "Object share" project in the DXOS Composer space._

## M1: Design

- [x] Research invitations, deep links, replication, plugin enablement (DESIGN.md §3–§7).
- [x] Write DESIGN.md and register the project.

## M2: Partial sync (client-services / echo-host)

- [x] `SpaceMetadata.sync_scope` proto field and metadata-store accessors.
- [x] `syncScope` on `AcceptInvitationRequest`, threaded to `acceptSpace`.
- [x] `EchoHost.setSpaceSyncScope`: scoped collection + `'out-of-scope'` quarantine, released on extend.
- [x] `SpacesService.updateSpace({ extendSyncScope })` + `space.internal.extendSyncScope`.
- [x] `client.spaces.join(invitation, { syncScope })`.
- [x] Unit test: scoped space quarantines out-of-scope documents and keeps them out of the collection.
- [x] E2E test (`client-e2e/spaces-sync-scope.test.ts`): a scoped guest gets only the scoped object, and the rest once
      the scope grows.
- [x] Classical sync drops inbound changes to a quarantined document (Subduction's `authorizePut` already did), and a
      release schedules an index pass.

## M3: Sharing (plugin-space)

- [x] Share payload codec + tests.
- [x] Scope collection (refs + markdown links + properties) + tests.
- [x] Required-plugin lookup from schema modules.
- [x] `SpaceOperation.ShareObject` (delegated invitation + URL).
- [x] Share dialog (Google-Docs layout) + Share action on every object + navbar button.

## M4: Opening a link

- [x] `?share=` navigation handler: member / non-member / waits for identity.
- [x] plugin-onboarding: create identity in place for share links (no welcome).
- [x] Enable required plugins before projection.

## M5: Demo and landing

- [x] plugin-space `PLUGIN.mdl` QA test for the flow.
- [ ] Autocue two-peer flow + recorded side-by-side video.
- [ ] Format, lint, typecheck, tests; push.

## Follow-ups (not v1)

- [ ] EDGE per-member document allowlist (DESIGN.md §8).
- [ ] Carry the scope in the delegation credential; mesh peers honour it.
- [ ] Grow the scope on the host by following references.
- [x] Persist "created by this guest" so own objects survive reload in scope.
- [ ] Move invitation params into the URL fragment.
- [ ] Stop sharing / revoke from the dialog.
