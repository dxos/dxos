# Cloudflare Developers Discord: what the community data says

Sixty days of the Cloudflare Developers Discord (2026-09-17 to 2026-11-16), read through the feeds pipeline and
queried headlessly. Every number here comes from a query you can rerun (see "How to reproduce"). People are
described, not named: the server is public, but the profiles describe real people. Named profiles are in the local
`~/.local/share/dxos/discord-insights/REPORT-full.md`, which is not committed.

## Dataset

|               |                                                                                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Channels      | 37 product channels and help forums; `#general`, `#intros`, `#off-topic`, `#love`, `#events`, `#showcase` and the announcement channels left out (the 30-day crawl showed them to be spam, greetings and account questions); one restricted forum (`#questions-or-issues`) unreadable |
| Messages      | 3,625 human messages from 976 people, plus 1,819 bot messages (almost all the Help Bot in `#help-ai`)                                                                                                                                                                                 |
| Threads       | 698 forum and channel threads; 627 whose starting message falls inside the window (the others are left out of thread statistics)                                                                                                                                                      |
| Roles         | server roles fetched for 930 members: 27 staff (`Cloudflare`, `Cloudflare Community Team`), 9 recognised experts (`Cloudflare Dev Expert`, `Community MVP`, `Mods`), 2 former staff                                                                                                   |
| Announcements | 370 developer-changelog entries and 20 blog posts from the last 90 days                                                                                                                                                                                                               |

The busiest channels: `#help` 1,021 messages, `#workers-and-pages` 486, `#email-service-beta` 368, `#durable-objects`
217, `#d1-database` 196, `#workers-ai` 147, `#hyperdrive` 140, `#workflows` 122, `#r2` 118.

## Findings

### 1. Volunteers carry the help load, and recognised experts are the fastest responders

- Of the 258 threads that got a human answer, the first answer came from a community member in 84, Cloudflare staff
  in 82, a recognised expert (Dev Expert, Community MVP, moderator) in 50, and a member whose roles weren't fetched in 42. Experts answer in 2.6 hours on average; community members in 15.2; staff in 22.2. The median first human
  answer arrives in 3.2 hours.
- 71% of all messages classified as answers come from people who are not staff.
- The members who help the most people are volunteers: a server booster helped 69 different people in 60 days, a
  Community MVP 68, an unaffiliated member 34, another 31, an independent developer 21. The most helpful staff member
  helped 28.
- Profiles of the top helpers (local report) are the kind a developer-relations team would want: an unaffiliated
  volunteer who triages DNS, SSL and account lockouts and repeatedly redirects people to support tickets; an
  independent developer who ships an open-source framework on Durable Objects, answers DO internals questions and
  measures Cloudflare's published performance claims; a volunteer who escalates unanswered Workers AI billing threads
  to staff.

### 2. Half of the help forum goes unanswered, and the AI forum is answered only by a bot

- In `#help`, 111 of 253 threads (44%) got no reply at all.
- In `#help-ai`, 244 of 246 threads were answered only by the Cloudflare Help Bot, never by a person.

### 3. Who posts: a long tail

| Messages per person | People |
| ------------------- | ------ |
| 1                   | 452    |
| 2–3                 | 313    |
| 4–10                | 158    |
| 11–30               | 38     |
| 31–100              | 11     |
| 100+                | 2      |

Weekly volume is steady at 310–520 human messages (weeks starting 2026-09-21 to 2026-11-09).

### 4. Product sentiment: builds, dashboard and billing hurt; the new email product is liked

Every message was classified (Claude Haiku 5.5, $0.05 per 1,000 messages) with its kind, tone and the products it
is about, with a tone toward each product from -1 to 1.

| Product         | Mentions | Tone  | Negative | Positive |
| --------------- | -------- | ----- | -------- | -------- |
| Workers         | 637      | -0.11 | 176      | 60       |
| Email Service   | 350      | +0.06 | 56       | 64       |
| Dashboard       | 269      | -0.32 | 127      | 2        |
| Durable Objects | 257      | +0.02 | 37       | 38       |
| D1              | 225      | -0.10 | 56       | 23       |
| Billing         | 214      | -0.29 | 88       | 5        |
| DNS             | 199      | -0.20 | 71       | 6        |
| Workers AI      | 188      | -0.23 | 82       | 12       |
| R2              | 168      | -0.24 | 67       | 6        |
| Pages           | 151      | -0.30 | 77       | 6        |
| Hyperdrive      | 143      | -0.08 | 39       | 22       |
| Workers Builds  | 42       | -0.42 | 28       | 1        |
| Turnstile       | 34       | -0.38 | 20       | 1        |

Message kinds overall: 1,000 questions, 856 answers, 533 bug reports, 331 feedback, 162 feature requests, 38
showcases. Workers draws the most bug reports (138); Email Service the most feature requests (37).

### 5. Sentiment against the launch timeline

- Workers AI talk peaked in the week of 2026-10-19 (44 mentions, tone -0.30). The changelog announced three Workers AI
  entries that week (the Clairic extraction model and DeepSeek V4.1 Flash among them), but the negative messages were
  about a quota bug: error 4006 "despite zero usage", Neuron quotas not resetting for 48 hours, "issue ignored for
  weeks". A launch did not move the tone; an unresolved bug did.
- Email Service (in beta) went from -0.14 in the week of 2026-09-14 to +0.14–0.18 from the week of 2026-10-12 on, the
  only major product to improve.
- Workers Builds stays negative every week it is mentioned (-0.26 to -0.70): builds stuck in the queue, clone
  failures since Oct 27, intermittent 504s breaking deploys.

### 6. The FAQ for agents: what keeps being asked

A second pass (Haiku with thinking) grouped the 2,165 questions and bug reports of each product into recurring
problems, each with the gap it reveals. 358 problems across 30 products; the most common:

| Product       | Problem                                                                     | Questions | Gap                                                           |
| ------------- | --------------------------------------------------------------------------- | --------- | ------------------------------------------------------------- |
| Email Service | Daily sending quota increase requests stall with no visible approval path   | 44        | No self-serve or documented procedure, timeline or criteria   |
| Workers       | Cron Triggers stop firing, fire late, or disappear after a deploy or outage | 17        | No status or recovery guidance for lost or delayed schedules  |
| Dashboard     | Login fails with errors, redirect loops or blank pages                      | 15        | No troubleshooting guidance or status communication           |
| Workflows     | Runs reported as canceled, more often with more steps                       | 14        | Cancellation behavior undocumented or buggy                   |
| Workers       | Raw TCP sockets (SMTP, nodemailer) cannot be used                           | 14        | Docs don't state sockets are unsupported or give alternatives |
| R2            | Access suspended over a balance even after payment                          | 14        | Errors don't explain the suspension or how to clear it        |
| Hyperdrive    | Random query stalls of about 3–3.2 seconds                                  | 14        | No documented cause or mitigation                             |
| Pages         | Builds stall at "initializing build environment"                            | 12        | No queue status or expected start time                        |
| API           | Scoped API tokens get 403s on Workers deployments                           | 10        | Docs don't state each endpoint's required permission          |
| D1            | Queries stall for 1–60 seconds                                              | 10        | No documented cause, baseline or mitigation                   |
| Workers AI    | Quota error 4006/429 with zero usage                                        | 9         | —                                                             |

### 7. What Cloudflare shipped, as facts

The standard fact extractor over 298 changelog entries and blog posts ($0.05) builds a product map queryable with
SPARQL: features as parts of products (Clairic, PhoneLLM Mini and DeepSeek V4.1 Flash are part of Workers AI; session
recordings part of Browser Run), and what uses what (Python Workers uses Hyperdrive; Sandbox SDK 1.0 uses the Durable
Object container API).

## Extraction runs

The standard extractor (`moon run plugin-discord:crawl-export`, Haiku 5.5 with thinking, vocabulary packs, cached
instructions) over both crawls:

|                                           | 30 days, all human channels | 60 days, product channels                                  |
| ----------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| Messages                                  | 3,720                       | 3,625                                                      |
| Time                                      | about 103 min (serial)      | 15.7 min (4 extraction batches, 8 topic summaries at once) |
| Cost                                      | $0.68                       | $0.67 ($0.19 per 1,000 messages)                           |
| Facts from the model                      | 622                         | 578                                                        |
| Questions found                           | 1,148                       | 1,721                                                      |
| Minted predicates                         | 24 kinds, 75 uses           | 21 kinds, 92 uses                                          |
| Extraction calls reading the prompt cache | 95 of 97                    | 145 of 149                                                 |

The product-channel crawl gives about 50% more questions from slightly fewer messages: the social channels it drops
were greetings and chatter. The open-triple facts remain the weak part (`uses` dominates); the typed classification
(kind, product, tone) and the FAQ grouping carry most of the insight per dollar.

## How to reproduce

```bash
# Exports (needs a Discord token; see plugin-discord/src/testing/discord-export.ts)
pnpm exec tsx src/testing/discord-export.ts --guild 595317990191398933 --scan --out <dir>
pnpm exec tsx src/testing/discord-export.ts --channel <ids> --days 60 --out <dir>
pnpm exec tsx src/testing/discord-export.ts --guild 595317990191398933 --members --out <dir>

# Insights database (from packages/plugins/plugin-discord)
pnpm exec tsx src/testing/insights/build.ts --export <dir> --db <insights.db>
pnpm exec tsx src/testing/insights/timeline.ts --db <insights.db>
pnpm exec tsx src/testing/insights/classify.ts --db <insights.db>
pnpm exec tsx src/testing/insights/faq.ts --db <insights.db>
pnpm exec tsx src/testing/insights/profiles.ts --db <insights.db>
pnpm exec tsx src/testing/insights/blog-facts.ts --db <insights.db> --facts <blog-facts.db>

# Queries
moon run plugin-discord:facts -- sql @src/testing/insights/queries/helpers.sql --crawl <insights.db>
moon run plugin-discord:facts -- sql @src/testing/insights/queries/activity.sql --crawl <insights.db> --bars
moon run plugin-discord:facts -- sparql 'SELECT ?s ?p ?o WHERE { GRAPH ?g { ?s ?p ?o } } LIMIT 20' --facts <facts.db>
```

Model cost of the whole analysis: classification $0.18, FAQ $0.06, profiles $0.01, blog facts $0.05, re-extraction
$0.67.

## Caveats

- The Discord token stopped working (401) after the member-role lookups, so roles are missing for authors who appear
  only in the 60-day crawl ("no roles" in the tables), and no further crawl is possible without a new token.
- Tone and kind come from one model pass; spot checks agree, but there is no labelled set to measure accuracy.
- "Helped" counts replies to someone else and messages in a thread someone else started; a thank-you counts.
- Profiles send each person's recent messages to the model (Anthropic API); they are only stored locally.
