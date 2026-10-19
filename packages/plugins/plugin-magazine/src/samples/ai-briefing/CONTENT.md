# AI Briefing

A reader keeps up with AI and tech news from five real publications: two newsrooms, one magazine,
one podcast newsletter and one engineer's blog. The space starts with the subscriptions and an empty
magazine. Right after the space is created, one curation run fetches the latest posts from every
feed and has the agent pick the AI stories for the magazine, so the content is live but the set of
sources is fixed.

- Code: `feeds.ts` (seed tables), `partial.ts`, exported as `Partial` from `./index.ts`.
- Requires: nothing
- Optional: nothing
- Provides: `feeds.verge`, `feeds.mittr`, `feeds.latent`, `feeds.wired`, `feeds.simon`, `magazine`,
  `routine`
- Clock: unused. Posts come from the live feeds at creation time.
- Used by: `AiBriefingSpace.makeTemplate` (`org.dxos.plugin.magazine.template.ai-briefing`)

## Contents

- 5 `Subscription.Subscription` (`type: 'rss'`), each with its post feed, content feed, `StateMap`
  and `TagIndex`. No posts are seeded. The feeds fill when curation syncs them.

  | Key      | Name                     | URL                                                                  | Format |
  | -------- | ------------------------ | -------------------------------------------------------------------- | ------ |
  | `verge`  | The Verge: AI            | `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml`  | Atom   |
  | `mittr`  | MIT Technology Review AI | `https://www.technologyreview.com/topic/artificial-intelligence/feed` | RSS    |
  | `latent` | Latent Space             | `https://www.latent.space/feed`                                      | RSS    |
  | `wired`  | Wired: AI                | `https://www.wired.com/feed/tag/ai/latest/rss`                       | RSS    |
  | `simon`  | Simon Willison's Weblog  | `https://simonwillison.net/atom/entries/`                            | Atom   |

- 1 `Magazine.Magazine` **AI Briefing**, made with `Magazine.make`, with `feeds` → all 5
  subscriptions and no `posts`. Its curation `Instructions` compose the default methodology with
  this topic: new models and research, AI products and companies, policy, and hands-on engineering
  with LLMs. `keep` is the default (10).
- 1 `Routine.Routine` **Curate AI Briefing**, made with `Wire.makeRoutine`. Its action is the
  `CurateMagazine` operation and it has one `Trigger.Trigger`: timer `0 9 * * *`, input
  `magazine` → AI Briefing, `enabled: false`.
- No `Collection`. The magazine and subscriptions have no parent, so the navtree lists AI Briefing
  in the Content group's Magazines section, with the 5 subscriptions as its children in table order.
- Curation: the template's `build` schedules one `CurateMagazine` run on the magazine once the
  partial is written. `SpaceOperation.ApplyTemplate` runs `build` in the new space's process, which
  provides `Operation.Service`. Space creation does not wait for the run.
  - `CurateMagazine` syncs all 5 feeds, then runs the agent through EDGE inference. No API key is
    needed when the identity has an EDGE credential.
  - If the agent call fails, the feeds keep their posts and the magazine stays empty; pressing Curate
    retries.
  - If a feed fetch fails, that subscription stays empty and the others still sync.
- RSS parsing: `fetchRss` reads `media:content` and `media:thumbnail` as a post's image when the
  description has no `<img>`. Wired carries its images only there.

## Flows

1. Create a space from the AI Briefing template. The navtree's Content group has a Magazines
   section with AI Briefing, and expanding it shows the 5 feeds.
2. Open AI Briefing. Within about five minutes of creation it fills with up to 10 tiles drawn from
   the feeds; the agent reads full articles, so it is not instant.
3. Click a tile. The post opens with its body.
4. Open each feed. Each one lists the posts the sync fetched.
5. Open the routine list. Curate AI Briefing is present with its trigger off.

## Checks

- 5 subscriptions with the URLs and names in the table, all `type: 'rss'`, and no posts.
- The magazine's `feeds` are the 5 subscriptions in table order, its `posts` are empty, and its
  instructions contain the topic.
- 1 routine whose action is `CurateMagazine`, with 1 timer trigger `0 9 * * *` that is disabled and
  whose input is the magazine.
- No collection, and the magazine and the 5 subscriptions have no parent.
- The build schedules exactly one `CurateMagazine` run, on the magazine.
