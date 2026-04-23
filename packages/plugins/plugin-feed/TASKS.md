# Feed Plugin — Tasks

## Phase 3: Full AT Protocol Integration

Phase 2.5 added public, unauthenticated Bluesky feed reading via the `app.bsky.feed.getAuthorFeed` XRPC endpoint.
Phase 3 extends this with authenticated AT Protocol support for richer functionality.

### Prerequisites

- Add `@atproto/api` dependency (AT Protocol client SDK).
- Evaluate whether to use the official SDK or continue with raw XRPC calls.

### Tasks

- [ ] **Authenticated session management**
  - Implement Bluesky login flow (identifier + app password).
  - Store session tokens securely (consider DXOS credential storage patterns).
  - Handle token refresh and session expiry.
  - Add settings UI for managing AT Protocol credentials.

- [ ] **DID resolution**
  - Resolve handles to DIDs via `com.atproto.identity.resolveHandle`.
  - Cache DID ↔ handle mappings to avoid repeated lookups.
  - Support both `did:plc` and `did:web` methods.

- [ ] **Private feed access**
  - Fetch feeds from accounts that require authentication.
  - Respect block/mute lists in feed results.

- [ ] **Rich post content**
  - Map embedded images (`app.bsky.embed.images`) to post metadata.
  - Map embedded links/cards (`app.bsky.embed.external`) to post link/description.
  - Map quote posts (`app.bsky.embed.record`) — show quoted content inline.
  - Handle reply threads — link parent/root references.

- [ ] **Timeline and custom feeds**
  - Fetch authenticated user's home timeline (`app.bsky.feed.getTimeline`).
  - Subscribe to custom/algorithmic feeds (`app.bsky.feed.getFeed` with feed URI).
  - Add feed type selector in create dialog (author feed vs. timeline vs. custom feed).

- [ ] **Cursor-based pagination**
  - Use AT Protocol cursor from `getAuthorFeed`/`getTimeline` responses for incremental sync.
  - Store AT Protocol cursor in `Subscription.Feed.cursor` field.
  - Handle cursor invalidation (feed may reset cursor on server side).

- [ ] **Write operations (future)**
  - Like posts (`app.bsky.feed.like`).
  - Repost (`app.bsky.feed.repost`).
  - Create posts (`com.atproto.repo.createRecord`).
  - These require authenticated sessions and careful UX design.

### References

- AT Protocol specification: https://atproto.com
- Bluesky API reference: https://docs.bsky.app
- `@atproto/api` SDK: https://github.com/bluesky-social/atproto/tree/main/packages/api
- XRPC endpoints: https://github.com/bluesky-social/atproto/tree/main/lexicons
