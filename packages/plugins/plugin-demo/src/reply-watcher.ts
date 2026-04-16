//
// Copyright 2026 DXOS.org
//

/**
 * Polls Slack for replies to DemoNudges. When the mention-recipient says yes
 * (or similar), moves the referenced Trello card to "Done" and updates the
 * ECHO TrelloCard so the UI reflects the change.
 *
 * Runs alongside the pr-poller / event-observer / nudge-poster in
 * observers.ts. Kept in its own module to keep the concerns separate —
 * this one reads FROM Slack; the poster writes TO Slack.
 */

import { type Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Trello } from '@dxos/plugin-trello/types';

import { readSlackPostConfig } from './containers/DemoPanel/slack-post';
import { moveCardToListByName, readTrelloAuth } from './containers/DemoPanel/trello-client';
import { Demo } from './types';

const REPLY_POLL_INTERVAL_MS = 3_000;
const DEFAULT_DESTINATION_LIST = 'Done';

const AFFIRMATIVE = /\b(yes|yeah|yep|sure|ok|okay|please|do it|go|move it|move it to done|done)\b/i;
const NEGATIVE = /\b(no|not now|later|skip|cancel)\b/i;

type SlackMessage = {
  readonly ts: string;
  readonly user?: string;
  readonly text?: string;
  readonly thread_ts?: string;
};

type SlackHistory = { readonly ok: boolean; readonly messages?: SlackMessage[]; readonly error?: string };

const fetchSlackMessagesSince = async (
  channel: string,
  oldestTs: string,
  botToken: string,
): Promise<SlackMessage[]> => {
  const url = `/api/slack/conversations.history?channel=${encodeURIComponent(channel)}&oldest=${encodeURIComponent(oldestTs)}&inclusive=false&limit=50`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${botToken}` } });
  const body = (await response.json()) as SlackHistory;
  if (!body.ok) {
    throw new Error(body.error ?? 'slack history failed');
  }
  return body.messages ?? [];
};

const fetchSlackReplies = async (
  channel: string,
  parentTs: string,
  botToken: string,
): Promise<SlackMessage[]> => {
  const url = `/api/slack/conversations.replies?channel=${encodeURIComponent(channel)}&ts=${encodeURIComponent(parentTs)}&limit=50`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${botToken}` } });
  const body = (await response.json()) as SlackHistory;
  if (!body.ok) {
    return [];
  }
  return (body.messages ?? []).filter((msg) => msg.ts !== parentTs);
};

let started = false;

export const startReplyWatcher = (db: Database.Database): void => {
  if (started) {
    return;
  }
  started = true;
  log.info('demo: starting Slack reply watcher');

  setInterval(async () => {
    try {
      const config = readSlackPostConfig();
      if (!config) {
        return;
      }
      const nudges = await db.query(Filter.type(Demo.DemoNudge)).run();
      const unresolved = nudges.filter((nudge) => nudge.posted && nudge.postedTs && !nudge.resolved);
      if (unresolved.length === 0) {
        return;
      }
      const mentionId = globalThis.localStorage?.getItem('DEMO_NUDGE_MENTION_ID') ?? '';

      for (const nudge of unresolved) {
        const parentTs = nudge.postedTs!;
        const candidates = await collectResponseCandidates(config, parentTs);
        const responder = candidates.find((msg) => {
          if (mentionId && msg.user !== mentionId) {
            return false;
          }
          const text = msg.text ?? '';
          return AFFIRMATIVE.test(text) || NEGATIVE.test(text);
        });
        if (!responder) {
          continue;
        }
        const affirmative = AFFIRMATIVE.test(responder.text ?? '');
        if (!affirmative) {
          Obj.change(nudge, (mutable) => {
            mutable.resolved = true;
          });
          log.info('demo: nudge declined', { id: nudge.id });
          continue;
        }
        await handleAffirmativeReply(db, nudge);
      }
    } catch (err) {
      log.info('demo: reply-watcher tick failed', { error: String(err) });
    }
  }, REPLY_POLL_INTERVAL_MS);
};

const collectResponseCandidates = async (
  config: { botToken: string; channel: string },
  parentTs: string,
): Promise<SlackMessage[]> => {
  // Look at channel messages posted after the nudge AND any threaded replies.
  // Slack deduplicates by ts across both surfaces.
  const [channelMessages, threadReplies] = await Promise.all([
    fetchSlackMessagesSince(config.channel, parentTs, config.botToken).catch(() => [] as SlackMessage[]),
    fetchSlackReplies(config.channel, parentTs, config.botToken).catch(() => [] as SlackMessage[]),
  ]);
  const byTs = new Map<string, SlackMessage>();
  for (const msg of [...channelMessages, ...threadReplies]) {
    byTs.set(msg.ts, msg);
  }
  return [...byTs.values()].sort((first, second) => first.ts.localeCompare(second.ts));
};

const handleAffirmativeReply = async (db: Database.Database, nudge: Demo.DemoNudge): Promise<void> => {
  const card = nudge.card?.target;
  if (!card) {
    log.info('demo: nudge has no card ref; skipping move', { id: nudge.id });
    Obj.change(nudge, (mutable) => {
      mutable.resolved = true;
    });
    return;
  }
  const credentials = readTrelloAuth();
  if (credentials) {
    try {
      const result = await moveCardToListByName(
        card.trelloCardId,
        credentials.boardId,
        DEFAULT_DESTINATION_LIST,
        credentials.auth,
      );
      Obj.change(card, (mutable) => {
        mutable.listName = result.listName;
        mutable.trelloListId = result.listId;
      });
      Obj.change(nudge, (mutable) => {
        mutable.resolved = true;
        mutable.resolvedList = result.listName;
      });
      log.info('demo: moved card via affirmative reply', {
        card: card.name,
        from: card.listName,
        to: result.listName,
      });
      return;
    } catch (err) {
      log.warn('demo: trello move failed; updating ECHO only', { error: String(err) });
    }
  } else {
    log.info('demo: no trello creds in localStorage; updating ECHO only');
  }
  // Local-only fallback so the UI still reflects the action.
  Obj.change(card as Trello.TrelloCard, (mutable) => {
    mutable.listName = DEFAULT_DESTINATION_LIST;
  });
  Obj.change(nudge, (mutable) => {
    mutable.resolved = true;
    mutable.resolvedList = DEFAULT_DESTINATION_LIST;
  });
};
