# Reading Room

A reader follows three illustrated publications — a space newsletter, an outdoors and travel blog,
and a software craft journal — and keeps one magazine curated from them for the weekend. Every
post has a hero photograph and a full article body, so the feeds and the magazine read offline.

- Code: `feeds.ts` (seed tables), `partial.ts`, exported as `Partial` from `./index.ts`.
- Requires: nothing
- Optional: nothing
- Provides: `feeds.orbit`, `feeds.trail`, `feeds.bench`, `magazine`
- Clock: posts published −13d to −1d; read markers at −0d 08:00
- Used by: `ReadingRoomSpace.makeTemplate` (`org.dxos.plugin.magazine.template.reading-room`)

## Contents

- 3 `Subscription.Subscription` (`type: 'rss'`), each with its post feed, content feed, `StateMap`
  and `TagIndex`. Feed URLs are on `.example` hosts, so a sync fetches nothing.

  | Key     | Name          | Posts |
  | ------- | ------------- | ----- |
  | `orbit` | Orbit Weekly  | 10    |
  | `trail` | Trail & Tide  | 10    |
  | `bench` | The Workbench | 10    |

- 30 `Subscription.Post`, appended to their subscription's feed, each with `source` → its
  subscription, a `link` under the feed's host, an author, and a `description` that is the summary
  in a `<p>` followed by an `<img>` of the hero photograph (an Unsplash photo URL).
- 30 `Subscription.PostContent`, one per post in its subscription's content feed: `post` → the post,
  `text` is Markdown (hero image, summary, two paragraphs), with `snippet` and `imageUrl` set.
- 1 `Magazine.Magazine` **Weekend Reading** with `feeds` → all 3 subscriptions, a topic in its
  curation `Instructions`, and 12 curated `posts` (4 per feed). Each curated post has a magazine
  `postState` entry with `rank` 0–11, an agent-style `snippet` and the hero `imageUrl`.
- Read: 3 posts have `readAt` on their subscription's `postState`.
- Starred: 2 posts carry the system `Starred` tag in their subscription's `TagIndex`.
- 1 `Collection` "Reading Room" on the space root: Weekend Reading, Orbit Weekly, Trail & Tide,
  The Workbench.

## Flows

1. Create a space from the Reading Room template; the navtree shows the Reading Room collection.
2. Open Weekend Reading: a masonry of 12 tiles, each with a photograph, the newest-ranked first.
3. Click a tile: the post opens with its photograph and body, without a network fetch.
4. Open Orbit Weekly: 10 posts, newest first, each with a photograph.

## Checks

- 3 subscriptions, 30 posts (10 per feed) and 30 post contents.
- Every post's description carries an `<img>` and every content entry an `imageUrl`.
- The magazine lists 12 posts, 4 from each feed, each with a rank, snippet and image in its
  `postState`.
- 3 posts are read and 2 are starred.
- The Reading Room collection's labels are `Weekend Reading, Orbit Weekly, Trail & Tide, The Workbench`.
