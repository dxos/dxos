//
// Copyright 2026 DXOS.org
//

import { trim } from '@dxos/util';

/**
 * Five findings from a 60-day analysis of the Cloudflare Developers Discord (`.agents/projects/discord-insights/
 * REPORT.md`), as aggregate tables an agent can turn into artifacts. No people are named.
 */
export const CLOUDFLARE_FINDINGS = trim`
  # Cloudflare Developers Discord — five findings

  Sixty days (2026-09-17 to 2026-11-16) of 37 product channels and help forums: 3,625 human messages from 976 people.

  ## 1. Who answers first

  Threads that got a human answer, by who answered first.

  | Responder | Threads | Average hours to first answer |
  |---|---|---|
  | Community member | 84 | 15.2 |
  | Cloudflare staff | 82 | 22.2 |
  | Recognised expert (Dev Expert, MVP, moderator) | 50 | 2.6 |
  | Member without fetched roles | 42 | 21.8 |

  ## 2. Unanswered help threads

  | Forum | Threads | No reply at all | Answered only by the bot |
  |---|---|---|---|
  | #help | 253 | 111 | 0 |
  | #help-ai | 246 | 0 | 244 |

  ## 3. How much people post

  | Messages per person | People |
  |---|---|
  | 1 | 452 |
  | 2–3 | 313 |
  | 4–10 | 158 |
  | 11–30 | 38 |
  | 31–100 | 11 |
  | 100+ | 2 |

  ## 4. Product tone (−1 to 1) and volume

  | Product | Mentions | Tone |
  |---|---|---|
  | Workers | 640 | −0.11 |
  | Email Service | 354 | 0.07 |
  | Dashboard | 271 | −0.32 |
  | Durable Objects | 257 | 0.02 |
  | D1 | 225 | −0.10 |
  | Billing | 214 | −0.29 |
  | Workers AI | 188 | −0.23 |
  | Pages | 151 | −0.30 |
  | Workers Builds | 42 | −0.42 |
  | Turnstile | 34 | −0.38 |

  ## 5. Workers AI: talk and tone by week, against launches

  Talk peaked the week three models launched, but the negative messages were about a quota bug (error 4006 with zero
  usage), not the launches.

  | Week of | Mentions | Tone | Changelog entries |
  |---|---|---|---|
  | 2026-09-14 | 12 | −0.18 | 1 |
  | 2026-09-21 | 25 | −0.42 | 0 |
  | 2026-09-28 | 22 | −0.14 | 1 |
  | 2026-10-05 | 13 | −0.34 | 1 |
  | 2026-10-12 | 31 | −0.21 | 1 |
  | 2026-10-19 | 44 | −0.30 | 3 |
  | 2026-10-26 | 13 | −0.17 | 1 |
  | 2026-11-02 | 20 | −0.04 | 1 |
  | 2026-11-09 | 11 | −0.26 | 2 |
`;

/** What the demo asks the agent, typed into the chat. */
export const FINDINGS_PROMPT =
  'Turn the five findings in the bound document into artifacts: for each finding create a sheet with its table and a chart that fits it (bar to compare, pie for shares, xy over time). Then create a presentation with one slide per chart, and a short markdown summary of the five findings.';
