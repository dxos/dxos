# Feed Plugin

- We will create a new FeedPlugin to manage and display feeds incl. RSS, BlueSky and other open protocols.
- Use this document to record and design issues or implementation details.
- Track any complex issues that were not obvious to implement or where you needed additional instructions.

## Issues

- We have an infrastructure concept of Feeds for ECHO objects stored on EDGE; these are accessed via the `@dxos/echo` `Feed` API.
  - We must carefully disambiguate this architectural feature from the "Application" level concern of public Feeds (e.g., RSS, Atom, etc.)
  - Even more confusingly, we will store RSS Feed entries as ECHO Feeds.
  - We also have an application level concept of Threads (e.g., for comments) and Channels; we might later combine this with the new concepts in this plugin.

## Phase 1 (Basic RSS)

- [x] Create the base structure for the plugin.
- [x] Create a new echo Schemas for `Feed` and `Post` under the `Subscription` namespace.
- [x] Create a SubscriptionStack component based off of EventStack; this will be used to display the list of subscribed feeds (i.e., `Subscription.Feed` objects).
- [x] Create a PostStack component based off of EventRecordStack; this will be used to display the entries for a given feed (i.e., `Subscription.Post` objects).
- [x] Create a FeedArticle container that instantiates a PostStack and is passed a `Subcription.Feed` object (bound to a `react-surface` definition).
- [x] Create a testing utility that can read a given RSS feed and create a `Subscription.Feed` object and `Subscription.Post` objects.
- [x] Create a storybook for FeedArticle that uses the testing utility.
- [x] Configure the plugin with `composer-app`.

## Phase 2 (Sync feeds)

- [x] Create SubscriptionArticle which should show a stack of `Subscription.Feed` objects from an ECHO query.
  - [ ] Each SubscriptionTile component should have a menu option to delete the feed.
  - [ ] The SubscriptionArticle Toolbar should have a button to create a new feed.
    - [ ] This should open a dialog to enter the feed URL via a simple `Form` (react-ui-form).
    - [ ] On Save create a new `Subscription.Feed`; or Cancel.
- [x] When selecting a feed, display the FeedArticle as a companion (similar to plugin-inbox MailboxArticle/MessageArticle).
- [x] Create a storybook for SubscriptionArticle.
- [x] Create a sync operation to fetch and sync posts for a given feed.
  - [x] Write the posts to the `Subscription.Feed`'s ECHO Feed.
- [x] Create `CreateFeedSchema` with `inputSchema` metadata for the framework's built-in create dialog.
- [x] Create app-graph-builder with feed listing under spaces, companion resolution, and sync action.
- [x] Register `OperationHandler` capability with `FeedOperationHandlerSet`.

### Review 2.1

- [ ] It seems that the subtasks of the "Create SubscriptionArticle" have not been addressed.

## Implementation Notes

### Namespace Disambiguation

- The `Subscription` namespace (`src/types/Subscription.ts`) disambiguates from the infrastructure `Feed` in `@dxos/echo`.
- `Subscription.Feed` = application-level RSS subscription (typename: `org.dxos.type.subscription.feed`).
- `Subscription.Post` = individual feed entry (typename: `org.dxos.type.subscription.post`).
- Each `Subscription.Feed` has a backing `Feed.Feed` (ECHO feed) referenced via `Ref.Ref`.

### SyncFeed Operation

- The `SyncFeed` operation uses `db.add(post)` to add posts as regular space objects rather than `Feed.append()`, because the `Feed.Service` Effect layer is not available in the operation handler context.
- Deduplication by guid is not yet implemented — this requires querying existing posts from the feed, which also needs `Feed.Service`.
- Feed metadata (name, description) is updated from the RSS channel on first sync if not already set.
- RSS/Atom parsing uses `fast-xml-parser` (dynamic import to keep it out of the main bundle).

### CORS for RSS Fetching

- Browser-based RSS fetching (storybooks) requires a CORS proxy. A Vite dev server proxy is configured in `tools/storybook-react/.storybook/main.ts` at `/api/rss?url=`.
- The `Builder.fromRss()` method accepts `{ corsProxy }` option for browser usage.
- The `SyncFeed` operation runs server-side/in the app context where CORS is not an issue.

### Companion Pattern

- Selecting a feed in `SubscriptionArticle` uses `AttentionOperation.Select` + `companionSegment('feed')`.
- The app-graph-builder creates a `PLANK_COMPANION_TYPE` node that resolves the selected post.
- Two surfaces: main view (`SubscriptionArticle`, no `companionTo`) and companion view (`FeedArticle`, with `companionTo`).

## Phase 3 (BlueSky)

- [ ] Research other feed protocols (BlueSky, etc.)

## Notes

### Open Protocols

The main contenders in this space are ActivityPub, AT Protocol (Bluesky), and Nostr — all sharing the intuition that the future of online communication should be decentralized, interoperable, and user-controlled. Werd Rounding out five:

- RSS — the original pull-based syndication format; a simple XML subscription model for polling content from any URL.
- Atom — the W3C-standardized successor to RSS, still widely deployed; structurally very similar but with a cleaner spec. Many "RSS" readers actually consume Atom natively.
- ActivityPub (W3C) — a protocol and open standard for decentralized social networking, providing both a client-to-server API for creating/modifying content and a federated server-to-server protocol for delivering notifications. It powers Mastodon, Pixelfed, PeerTube, and Threads' cross-posting layer. Wikipedia
- AT Protocol (Bluesky) — underpins Bluesky and lets users move their identity and social graph between services. Werd It's fully public and enumerable, and unauthenticated RSS has already been implemented for atproto as a demo. GitHub Yes, Bluesky has a fully open, public protocol — specs at atproto.com.
  https://en.wikipedia.org/wiki/AT_Protocol
- Nostr — focuses on simple, portable events that anyone can publish and anyone can subscribe to. Werd Extremely minimal: just keypairs, relays, and JSON event envelopes. Growing developer traction particularly in the crypto/privacy space.
- JSON Feed — a modern, developer-friendly alternative to RSS/Atom using JSON instead of XML. Straightforwardly maps to the same "list of items with metadata" model but much easier to produce and consume programmatically. Worth considering given your TypeScript-first stack.

### Bluesky
