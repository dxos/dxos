//
// Copyright 2026 DXOS.org
//

/**
 * Module-level observers that run regardless of which UI surface is open.
 *
 * Previously all of this behavior lived inside DemoPanel.tsx as React
 * useEffect hooks, which meant NOTHING happened unless the user had opened a
 * Demo Controls article. That was a surprise footgun for the orchestrator:
 * it could succeed setup and bootstrap, but the 15-second PR poll never
 * started because no panel was mounted.
 *
 * `startObservers(db)` is called once on first `ensureReady()` in globals.ts
 * and spins up three lightweight pollers:
 *
 *   1. GitHub PR poll (15 s) — calls `pollMergedPullRequests` when
 *      GITHUB_PAT and GITHUB_REPO are set.
 *   2. Event observer (2 s) — scans for unhandled DemoEvents and handles
 *      granola-note (→ aiMatch + write DemoMatch) and pr-merged
 *      (→ find matching card, write DemoNudge).
 *   3. Nudge poster (2 s) — when DEMO_LIVE_SLACK=true, posts each unposted
 *      DemoNudge via chat.postMessage and flips `posted=true`.
 *
 * The panel's useEffect observers are kept for now; both paths are idempotent
 * (they each claim events via a handled-ids set plus Obj.change(handled)),
 * but the panel ones should be dropped once this path is proven out.
 */

import { aiMatch } from '@dxos/ai-match';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { GitHub } from '@dxos/plugin-github/types';
import { Granola } from '@dxos/plugin-granola/types';
import { Trello } from '@dxos/plugin-trello/types';

import { matchNoteToCards } from './containers/DemoPanel/match-cards';
import { pollMergedPullRequests } from './containers/DemoPanel/pr-poller';
import { postNudgeToSlack, readSlackPostConfig } from './containers/DemoPanel/slack-post';
import { startReplyWatcher } from './reply-watcher';
import { Demo } from './types';

const PR_POLL_INTERVAL_MS = 15_000;
const EVENT_POLL_INTERVAL_MS = 2_000;
const MATCH_DELAY_MS = 800;
const NUDGE_DELAY_MS = 600;

let started = false;

/** Spin up the three pollers. Idempotent — subsequent calls are a no-op. */
export const startObservers = (db: Database.Database): void => {
  if (started) {
    return;
  }
  started = true;
  log.info('demo: starting module-level observers');

  startGithubPoller(db);
  startEventObserver(db);
  startNudgePoster(db);
  startReplyWatcher(db);
};

// -- 1. GitHub PR poller -------------------------------------------------------

const startGithubPoller = (db: Database.Database): void => {
  const tick = async () => {
    const pat = globalThis.localStorage?.getItem('GITHUB_PAT') ?? '';
    const repo = globalThis.localStorage?.getItem('GITHUB_REPO') ?? '';
    if (!pat || !repo) {
      return;
    }
    try {
      await pollMergedPullRequests(db, { pat, repo });
    } catch (err) {
      log.info('demo: pr-poller tick failed', { error: String(err) });
    }
  };
  void tick();
  setInterval(tick, PR_POLL_INTERVAL_MS);
};

// -- 2. DemoEvent observer -----------------------------------------------------

const processedGranolaEvents = new Set<string>();
const processedPrEvents = new Set<string>();

const startEventObserver = (db: Database.Database): void => {
  setInterval(async () => {
    try {
      const events = await db.query(Filter.type(Demo.DemoEvent)).run();
      for (const event of events) {
        if (event.handled) {
          continue;
        }
        if (event.kind === 'granola-note' && !processedGranolaEvents.has(event.id)) {
          processedGranolaEvents.add(event.id);
          void handleGranolaNote(db, event);
        } else if (event.kind === 'pr-merged' && !processedPrEvents.has(event.id)) {
          processedPrEvents.add(event.id);
          void handlePrMerged(db, event);
        }
      }
    } catch (err) {
      log.info('demo: event observer tick failed', { error: String(err) });
    }
  }, EVENT_POLL_INTERVAL_MS);
};

const handleGranolaNote = async (db: Database.Database, event: Demo.DemoEvent): Promise<void> => {
  await new Promise((resolveFn) => setTimeout(resolveFn, MATCH_DELAY_MS));
  try {
    const payload = event.payload ? (JSON.parse(event.payload) as { granolaId?: string }) : {};
    const granolaId = payload.granolaId;
    const records = await db.query(Filter.type(Granola.GranolaSyncRecord)).run();
    const record = records.find((candidate) => candidate.granolaId === granolaId);
    if (!record) {
      log.info('demo: granola event has no sync record yet', { granolaId });
      return;
    }
    const document = record.document?.target;
    const cards = await db.query(Filter.type(Trello.TrelloCard)).run();
    const cardMatches = await matchNoteToCards({ record, document, cards });
    if (document) {
      for (const match of cardMatches) {
        const card = cards.find((candidate) => candidate.id === match.cardId);
        if (!card) {
          continue;
        }
        db.add(
          Obj.make(Demo.DemoMatch, {
            document: Ref.make(document),
            card: Ref.make(card),
            confidence: match.confidence,
            reasoning: match.reasoning,
            source: match.source,
            createdAt: new Date().toISOString(),
          }),
        );
      }
    }
    Obj.change(event, (mutable) => {
      mutable.handled = true;
    });
    log.info('demo: wrote matches', { granolaId, matches: cardMatches.length });
  } catch (err) {
    log.warn('demo: match loop failed', { error: String(err) });
  }
};

type PrPayload = {
  number?: number;
  repo?: string;
  title?: string;
  author?: string;
  url?: string;
  mergedAt?: string;
  relatedKeywords?: readonly string[];
};

const handlePrMerged = async (db: Database.Database, event: Demo.DemoEvent): Promise<void> => {
  await new Promise((resolveFn) => setTimeout(resolveFn, NUDGE_DELAY_MS));
  try {
    const payload: PrPayload = event.payload ? JSON.parse(event.payload) : {};
    const cards = (await db.query(Filter.type(Trello.TrelloCard)).run()).filter((card) => !card.closed);
    const relevantCard = await chooseCardForPr(payload, cards);
    if (!relevantCard) {
      log.info('demo: pr-merged had no matching card', { keywords: payload.relatedKeywords });
      Obj.change(event, (mutable) => {
        mutable.handled = true;
      });
      return;
    }
    const matches = await db.query(Filter.type(Demo.DemoMatch)).run();
    const linkedMatch = matches
      .filter((match) => match.card?.target?.id === relevantCard.id)
      .sort((first, second) => (second.createdAt ?? '').localeCompare(first.createdAt ?? ''))[0];
    const meetingContext = linkedMatch?.document?.target?.name;

    // Prefer a Slack user-id ping (<@U…>) so the mention actually notifies.
    // Fall back to plain @name for preview-only rendering.
    const mentionId = globalThis.localStorage?.getItem('DEMO_NUDGE_MENTION_ID') ?? '';
    const mentionName = globalThis.localStorage?.getItem('DEMO_NUDGE_MENTION_NAME') ?? 'you';
    const mention = mentionId ? `<@${mentionId}>` : `@${mentionName}`;

    const lines: string[] = [];
    lines.push(
      `Hey ${mention} — the fix you ${meetingContext ? `discussed in "${meetingContext}"` : 'have been tracking'} just shipped.`,
    );
    lines.push('');
    if (payload.title) {
      lines.push(`• **PR ${payload.number ? `#${payload.number} ` : ''}**${payload.title}`);
    }
    // Author override: narrative may need "someone else on your team" even
    // when the real GitHub PR was opened by the demo runner. Falls back to
    // the real PR login if neither override is set.
    const authorOverrideId = globalThis.localStorage?.getItem('DEMO_PR_AUTHOR_ID') ?? '';
    const authorOverrideName = globalThis.localStorage?.getItem('DEMO_PR_AUTHOR_NAME') ?? '';
    const authorLabel = authorOverrideId
      ? `<@${authorOverrideId}>`
      : authorOverrideName
        ? authorOverrideName
        : payload.author
          ? `@${payload.author}`
          : undefined;
    if (authorLabel) {
      lines.push(`• author: ${authorLabel}`);
    }
    lines.push('');
    lines.push(
      `The card "${relevantCard.name}" is still in "${relevantCard.listName ?? 'your board'}" — want me to move it to Done?`,
    );

    db.add(
      Obj.make(Demo.DemoNudge, {
        channel: 'widgets-eng',
        mention: 'alice',
        text: lines.join('\n'),
        card: Ref.make(relevantCard),
        emittedAt: new Date().toISOString(),
        posted: false,
      }),
    );
    Obj.change(event, (mutable) => {
      mutable.handled = true;
    });
    log.info('demo: nudge emitted', { cardId: relevantCard.id, pr: payload.number });
  } catch (err) {
    log.warn('demo: nudge loop failed', { error: String(err) });
  }
};

/**
 * Pick the single card most relevant to a merged PR. Uses @dxos/ai-match
 * (semantic, Claude) when an Anthropic key is available; falls back to a
 * whole-word keyword scorer otherwise. Returns undefined if no card is a
 * plausible match.
 */
const chooseCardForPr = async (
  payload: PrPayload,
  cards: readonly Trello.TrelloCard[],
): Promise<Trello.TrelloCard | undefined> => {
  if (cards.length === 0) {
    return undefined;
  }
  const hasAiKey = Boolean(globalThis.localStorage?.getItem('ANTHROPIC_API_KEY'));
  if (hasAiKey) {
    try {
      const results = await aiMatch<PrPayload, Trello.TrelloCard>({
        source: [payload],
        target: cards,
        summarizeSource: (pr) => ({
          title: pr.title ?? '',
          repo: pr.repo ?? '',
          keywords: (pr.relatedKeywords ?? []).join(', '),
        }),
        summarizeTarget: (card) => ({
          name: card.name,
          list: card.listName ?? '',
          description: (card.description ?? '').slice(0, 400),
        }),
        sourceId: (pr) => String(pr.number ?? 'pr'),
        targetId: (card) => card.id,
        task:
          "Match a merged software engineering pull request to the one Trello card it most likely closes. A match means the PR shipped the feature / fix the card tracks. Prefer exact topic alignment (e.g. 'dark mode PR' → 'Dark mode card') over loose keyword overlap.",
      });
      const best = results.find((result) => result.confidence !== 'low');
      if (best) {
        log.info('demo: pr→card match via aiMatch', { card: best.target.name, confidence: best.confidence });
        return best.target;
      }
    } catch (err) {
      log.info('demo: aiMatch failed, falling back to word scorer', { error: String(err) });
    }
  }
  return chooseCardByWordScore(payload, cards);
};

/** Whole-word keyword scorer used as the offline fallback for card matching. */
const chooseCardByWordScore = (
  payload: PrPayload,
  cards: readonly Trello.TrelloCard[],
): Trello.TrelloCard | undefined => {
  const keywords = (payload.relatedKeywords ?? []).map((keyword) => keyword.toLowerCase());
  if (keywords.length === 0) {
    return undefined;
  }
  const scored = cards
    .map((card) => {
      const name = (card.name ?? '').toLowerCase();
      const desc = (card.description ?? '').toLowerCase();
      let score = 0;
      for (const keyword of keywords) {
        const rx = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
        if (rx.test(name)) {
          score += 2;
        }
        if (rx.test(desc)) {
          score += 1;
        }
      }
      return { card, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((first, second) => second.score - first.score);
  return scored[0]?.card;
};

// -- 3. Slack poster -----------------------------------------------------------

const postedNudgeIds = new Set<string>();

const startNudgePoster = (db: Database.Database): void => {
  setInterval(async () => {
    const config = readSlackPostConfig();
    if (!config) {
      return;
    }
    try {
      const nudges = await db.query(Filter.type(Demo.DemoNudge)).run();
      for (const nudge of nudges) {
        if (nudge.posted || postedNudgeIds.has(nudge.id)) {
          continue;
        }
        postedNudgeIds.add(nudge.id);
        try {
          const result = await postNudgeToSlack(config, nudge.text);
          Obj.change(nudge, (mutable) => {
            mutable.posted = true;
            mutable.postedTs = result.ts;
          });
          log.info('demo: nudge posted to slack', { id: nudge.id, channel: config.channel, ts: result.ts });
        } catch (err) {
          log.warn('demo: slack post failed', { id: nudge.id, error: String(err) });
        }
      }
    } catch (err) {
      log.info('demo: nudge poster tick failed', { error: String(err) });
    }
  }, EVENT_POLL_INTERVAL_MS);
};
