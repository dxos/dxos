# Space invitation notices over EDGE (phase 2)

Date: 2026-09-24
Status: decisions agreed in chat; implementation in progress.
Phase 1: `2026-09-24-space-invite-contact-picker-design.md` (merged, #13361).

## Goal

When a host adds a known contact to a space, the contact is told: an ephemeral toast if they are
online, and a pending entry in a Profile tab either way, with **Join** and **Dismiss**. Today the host
has to send the `?spaceKey=` link by hand. Any user can send a notice to any other user they know by
identity key.

## Decisions

| #   | Topic           | Decision                                                                                                                                                                                                                                  |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Confidentiality | Signed, **not encrypted**, in this phase. A per-identity encryption key shared across devices through HALO follows in a later PR; only the genesis device holds the identity private key, so encrypting to it would strand other devices. |
| 2   | Storage         | An `Inbox` module **inside `RouterObject`** (already one DO per identity, already persistent), behind a narrow interface so it can move to its own DO later.                                                                              |
| 2b  | Catch-up        | Pull on connect (`GET /inbox`) + push while online over the existing router socket; `POST /inbox/ack`. No per-socket cursor.                                                                                                              |
| 3   | Limits          | TTL 14 days; 50 sends per sender per day (all recipients); 100 pending per recipient (oldest dropped); dedupe by `(sender, spaceKey, role)` refreshes the entry. Named constants in the module.                                           |
| 4   | Multi-device    | Join or Dismiss on one device acks for **all** devices; the router tells online devices so their list updates.                                                                                                                            |
| 5   | Who can send    | Any authenticated, non-ephemeral identity. The recipient client shows a notice only if the verified sender is in its contact book; others are dropped silently.                                                                           |

## EDGE (edge repo, `packages/services/router`)

**Inbox module** — `src/worker/inbox/`:

- `Inbox` class over a small storage adapter (all keys under an `inbox:` prefix), so extraction to its
  own DO moves the class and its keys unchanged.
- Interface: `put(notice)`, `list()`, `ack(ids)`, `prune(now)`, plus `countSent(senderDid, now)` for
  the sender-side quota.
- Entry: `{ id, senderDid, sentAt, expiresAt, dedupeKey, payload }`; `payload` is the signed notice
  (opaque to EDGE).
- TTL enforced by `prune` on every access and by the router's existing `alarm()`.

**Endpoints** (router worker, `edgeAuth(['verifiablePresentation'])`, **no** ephemeral identities):

- `POST /inbox/:recipientDid` — the sender comes from the verified presentation, never the body.
  The sender's `RouterObject` checks and records the per-sender daily quota, then calls the recipient's
  `RouterObject` (DO RPC) to `put`; the recipient's router pushes a `serviceId: inbox` frame to every
  connected socket.
- `GET /inbox` — the caller's own pending notices.
- `POST /inbox/ack { ids }` — deletes for all devices and pushes an `ack` frame to online sockets.

**Why the sender quota lives with the sender:** the recipient's inbox only sees its own traffic.

## dxos

**Protocol** (`@dxos/protocols`): `EdgeService.INBOX`; inbox request/response schemas;
`SpaceInvitationNotice { spaceKey, role, sentAt }` credential assertion.

**Client services**:

- `EdgeHttpClient`: `sendInboxMessage(recipientDid, payload)`, `listInbox()`, `ackInbox(ids)`.
- `InboxService` RPC: `send`, `subscribe` (stream of verified notices: pull on connect, then pushes),
  `ack`. Exposed as `client.halo.inbox`.
- Signing: the sender issues a credential through `getIdentityCredentialSigner()` with the
  `SpaceInvitationNotice` assertion, `subject` = recipient identity key. The recipient runs
  `verifyCredential`, checks `issuer` = claimed sender and `subject` = self, ignores notices past the
  TTL, and dedupes by credential id.

**Plugins**:

- plugin-space: extract the join flow from the navigation handler into
  `SpaceOperation.JoinBySpaceKey` (used by the URL handler, the toast and the list). `AddMembers` sends
  a notice to each admitted contact; a failed send does not fail the operation (the join link remains).
- plugin-client: an inbox monitor capability (modelled on `remote-trace-monitor.ts`) raises a toast
  per new space with a **Join** action, skipping spaces already joined and senders not in the contact
  book; a non-hub-gated `Account.SpaceInvitations` article lists pending notices with Join / Dismiss.

## Testing

- EDGE: workerd tests for the module (TTL, quotas, dedupe, ack) and the endpoints (auth, ephemeral
  refusal, sender taken from the presentation).
- dxos: unit tests for sign/verify (forged issuer, wrong subject, expired, duplicate); client-services
  tests against a memory EDGE stub; stories for the article; the two-peer e2e (QA-10) extended so the
  guest joins from the notice instead of the link.
- Cross-repo iteration via `pnpm link-packages` from the edge checkout; never publish to test.

## Out of scope (later PRs)

- Encryption to the recipient (per-identity encryption key in HALO, advertised in the profile).
- Other message kinds over the same inbox.
