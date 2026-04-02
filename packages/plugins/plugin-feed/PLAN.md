# Feed Plugin

We will create a new FeedPlugin to manage and display feeds incl. RSS, BlueSky and other open protocols.

## Issues

- We have an infrastructure concept of Feeds for ECHO objects stored on EDGE; these are accessed via the `@dxos/echo` `Feed` API.
  - We must carefully disambiguate this architectural feature from the "Application" level concern of public Feeds (e.g., RSS, Atom, etc.)
  - Even more confusingly, we will store RSS Feed entries as ECHO Feeds.
  - We also have an application level concept of Threads (e.g., for comments) and Channels; we might later combine this with the new concepts in this plugin.

## Phase 1 (Basic RSS)

- [ ] Create the base structure for the plugin.
- [ ] Create a new echo Schemas for `Feed` and `Post` under the `Subscription` namespace.
- [ ] Create a SubscriptionStack component based off of EventStack; this will be used to display the list of subscribed feeds (i.e., `Subscription.Feed` objects).
- [ ] Create a PostStack component based off of EventRecordStack; this will be used to display the entries for a given feed (i.e., `Subscription.Post` objects).
- [ ] Create a FeedArticle container that instantiates a PostStack and is passed a `Subcription.Feed` object (bound to a `react-surface` definition).
- [ ] Create a testing utility that can read a given RSS feed and create a `Subscription.Feed` object and `Subscription.Post` objects.
- [ ] Create a storybook for FeedArticle that uses the testing utility.
- [ ] Configure the plugin with `composer-app`.

## Phase 2

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
