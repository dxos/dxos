# Invite existing users to a space from a contact book

Date: 2026-09-24
Status: design approved in chat; awaiting spec review.

## Goal

Let a user add someone they already share a space with to another space, by picking them from a
contact book instead of passing an invitation code around. The contact book is virtual — it is the
union of the members of every space the user belongs to — and is browsable from a new **Contacts**
article on the account profile (`dxos:account/profile`).

## What already exists

| Piece                      | Where                                                                                         | Notes                                                                                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Contact book               | `sdk/client-services/src/packlets/identity/contacts-service.ts`                               | Derived from all members of all local spaces, excludes self, merges `commonSpaces`. Not stored.                                                              |
| Client/React access        | `client.halo.contacts`, `useContacts()` (`sdk/react-client/src/halo/useContacts.ts`)          | `Contact { identityKey, profile?, commonSpaces }`. Unused in Composer today.                                                                                 |
| Direct admission           | `space.admitContact(contact)` → `SpacesService.admitContact`                                  | Writes a member credential for the identity key; no invitation code. RPC already accepts `role`; the client proxy hard-codes `ADMIN` (`space-proxy.ts:652`). |
| Guest join after admission | `client.spaces.joinBySpaceKey(spaceKey)`                                                      | Fetches the credential from any online member via the admission-discovery extension.                                                                         |
| Account articles           | `plugin-client` — `types/Account.ts`, `capabilities/app-graph-builder.ts`, `react-surface.ts` | Devices is the pattern to copy.                                                                                                                              |
| Members article            | `plugin-space/src/containers/MembersContainer/MembersContainer.tsx`                           | Member list, invitation list, Invite one / Invite many.                                                                                                      |
| Identity row               | `sdk/shell/src/components/IdentityList/IdentityListItem`                                      | Avatar, hue, emoji, fallback name.                                                                                                                           |

`Invitation.AuthMethod.KNOWN_PUBLIC_KEY` is **not** invite-by-identity: it verifies a throwaway
keypair whose private half travels inside the invitation code. It is not used here.

## Design

### 1. Data and SDK

- **Contacts:** `useContacts()` as is. No new storage.
- **SDK:** `space.admitContact(contact: Contact, role: SpaceMember.Role = EDITOR)` in
  `client-protocol/src/space.ts` and `client/src/echo/space-proxy.ts`, forwarding `role` to the
  existing RPC. The proxy's hard-coded `ADMIN` is the only change.
- **Operation:** `SpaceOperation.AddMembers` (plugin-space) — input `{ space, identityKeys, role }`,
  output `{ joinUrl }`. Calls `admitContact` per key; `joinUrl` is the app URL with `?spaceKey=<key>`.
- **Guest join:** plugin-space's navigation handler (which already handles `?spaceInvitationCode`)
  also handles `?spaceKey=X`: `joinBySpaceKey(X)`, then navigate to the space.

### 2. UI

**Presentational components in `sdk/shell`** (no client hooks; each with a `.stories.tsx`):

- `ContactList` — `{ contacts, spaces, onSelectSpace, filter }`. One `IdentityListItem` row per
  contact with a presence dot and chips for the spaces in common; clicking a chip calls
  `onSelectSpace`.
- `ContactPicker` — `{ contacts, excludeKeys, value, onChange }`. Multi-select `Combobox`, search on
  display name and identity key, `excludeKeys` hides existing members, selections show as checked
  items and a comma-separated trigger summary.

**Contacts article (plugin-client)**

- `Account.Contacts = 'contacts'` graph node alongside Devices (`ph--address-book--regular`); not
  gated on hub availability.
- `ContactsContainer`: `Panel` with a search input in the toolbar and `ContactList` in a
  `ScrollArea`. Data from `useContacts()` + `useSpaces()`; a space chip navigates to that space.

**Picker container (plugin-client, via surface)**

- New surface role `contact-picker` with data `{ space }`, served by `ContactPickerContainer`:
  `ContactPicker` + role select (Editor default; Viewer (`READER`), Admin) + **Add** button.
- **Add** calls the slot's `onAdd`, which MembersContainer implements with `SpaceOperation.AddMembers`
  (plugin-client cannot import plugin-space); on success the button becomes **Copy join link**.
- plugin-space never imports plugin-client; the slot renders nothing if no plugin contributes it.

**Members article (plugin-space)**

- `MembersContainer` renders `<Surface role='contact-picker' data={{ space }} />` above the existing
  Invite one / Invite many action, under the heading "Add people you know".
- Newly admitted members appear in `SpaceMemberList` immediately (the credential is written locally).

### 3. Errors and edge cases

- **Partial failure in `AddMembers`:** admit sequentially; collect per-key failures and report them
  in a toast naming the contacts that failed. Successful admissions are not rolled back.
- **Already a member:** filtered out by `excludeKeys`; the service call is idempotent anyway.
- **Not authorised:** the picker is disabled unless the current identity's role in the space is
  Admin or Owner. The existing invite actions are not gated today; gating them too is out of scope.
  If the service rejects the admission anyway, surface its error in the failure toast.
- **Guest opens the join link but was not admitted, or no member is online:** `joinBySpaceKey`
  retries while discovering; after 60 s show "Couldn't reach a member of this space — try again
  later". The link is inert to anyone not admitted.
- **Guest already a member:** the handler navigates straight to the space.
- **Empty contact book:** the picker shows "You have no contacts yet — people appear here once you
  share a space with them", and the existing invite actions remain available.

### 4. Testing

- **SDK:** extend `sdk/client-e2e/src/contact-book.test.ts` — `admitContact(contact, VIEWER)` yields
  a member with role Viewer (`READER`) after `joinBySpaceKey`; default is Editor.
- **Operation:** plugin-space unit test for `AddMembers` — multiple keys, one failure reported,
  others admitted, `joinUrl` contains the space key.
- **Navigation handler:** unit test that `?spaceKey=` calls `joinBySpaceKey` and navigates.
- **Components:** stories for `ContactList` and `ContactPicker` (with a play test for search +
  multi-select + exclusion); stories for `ContactsContainer` and `MembersContainer` with the slot
  filled.
- **End to end:** Playwright spec with two identities that share space A: host adds guest to space B
  from the picker, guest opens the join link, space B appears for the guest.

## Phase 2 — EDGE relay inbox (notification)

Phase 1 relies on the host sending the join link out of band. Phase 2 removes that step.

Each client already holds a connection to its own private swarm on EDGE via
`client.services.rpc` — see `plugins/plugin-client/src/capabilities/remote-trace-monitor.ts`, which
subscribes with `NetworkService.subscribeMessages({ peer, tags })`. Add a **relay service** on EDGE
that lets a user send a signed message to another user addressed only by their identity public key:

- Sender: `relay.send({ to: identityKey, payload })`, signed by the sender's identity.
- Recipient: the client subscribes to a tag derived from its own identity key and receives
  `SpaceInvitationNotice { spaceKey, from, role }`.
- On receipt Composer shows a notification ("<name> added you to <space>") with **Join**, which runs
  `joinBySpaceKey`.
- `AddMembers` sends the notice after admission; the join link stays as a fallback.

The relay is a generic user-to-user message channel; space invitation notices are its first use.
Open questions for phase 2: delivery when the recipient is offline (store-and-forward TTL), spam /
rate limiting, and whether the payload is end-to-end encrypted to the recipient's key.

## Out of scope

- Adding contacts manually (the book is derived only from shared spaces).
- Linking contacts to `Person` ECHO records.
- Changing the existing invitation-code flows.
