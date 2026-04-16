//
// Copyright 2026 DXOS.org
//

/**
 * Cross-tool synthesis — the "amazing demo" beats.
 *
 * Two flows:
 *
 *   generateMorningBriefing: pulls recent Granola notes, Trello card moves,
 *     PR merges, and DemoNudges out of ECHO, calls Claude to synthesize a
 *     short briefing paragraph, and appends it as an assistant Message to
 *     the default Chat's feed. This is the opening beat of the video —
 *     the agent narrating what happened across your tools overnight.
 *
 *   generateFridayUpdate: same data but a different prompt — produces a
 *     full markdown document summarizing the week's shipped work,
 *     decisions, and open threads. Written as a Markdown.Document in the
 *     space so it shows up in the sidebar like any other doc.
 *
 * Both paths call Anthropic through composer-app's /api/anthropic dev
 * proxy (same pattern as SlackFeed).
 */

import { Chat as AssistantChat } from '@dxos/assistant-toolkit';
import { type Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { GitHub } from '@dxos/plugin-github/types';
import { Granola } from '@dxos/plugin-granola/types';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Trello } from '@dxos/plugin-trello/types';
import { Message } from '@dxos/types';

import { Demo } from '../../types';
import { addToDemoCollection } from './collection';

const ANTHROPIC_URL = '/api/anthropic/v1/messages';
const MODEL = 'claude-sonnet-4-5';

type SpaceLike = { queues: { get: (dxn: any) => any } };

const readApiKey = (): string | undefined =>
  globalThis.localStorage?.getItem('ANTHROPIC_API_KEY') ?? undefined;

const callClaude = async (apiKey: string, system: string, user: string): Promise<string> => {
  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const data = (await response.json()) as {
    content?: { type: string; text: string }[];
    error?: { message: string };
  };
  if (!response.ok) {
    throw new Error(data.error?.message ?? `anthropic ${response.status}`);
  }
  const text = (data.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  return text.trim();
};

/** Snapshot the cross-tool state that both flows synthesize over. */
const gatherContext = async (db: Database.Database): Promise<string> => {
  const [notes, cards, matches, nudges, prs] = await Promise.all([
    db.query(Filter.type(Granola.GranolaSyncRecord)).run(),
    db.query(Filter.type(Trello.TrelloCard)).run(),
    db.query(Filter.type(Demo.DemoMatch)).run(),
    db.query(Filter.type(Demo.DemoNudge)).run(),
    db.query(Filter.type(GitHub.GitHubPullRequest)).run(),
  ]);

  const sections: string[] = [];

  if (notes.length > 0) {
    sections.push('## Meeting notes (Granola)');
    for (const note of notes.slice(-5)) {
      const title = note.document?.target?.name ?? '(untitled)';
      sections.push(`- "${title}" — ${note.createdAt ?? 'unknown time'}`);
    }
  }

  if (cards.length > 0) {
    sections.push('## Trello cards');
    for (const card of cards.slice(0, 15)) {
      sections.push(`- [${card.listName ?? '?'}] ${card.name}`);
    }
  }

  if (matches.length > 0) {
    sections.push('## Agent-linked matches');
    for (const match of matches.slice(-5)) {
      const document = match.document?.target?.name ?? 'note';
      const card = match.card?.target?.name ?? 'card';
      sections.push(`- "${document}" → "${card}" (${match.confidence}): ${match.reasoning}`);
    }
  }

  if (prs.length > 0) {
    sections.push('## Merged pull requests');
    for (const pr of prs.slice(-5)) {
      sections.push(`- #${pr.number} ${pr.title} by @${pr.author ?? '?'}`);
    }
  }

  if (nudges.length > 0) {
    sections.push('## Proactive nudges emitted');
    for (const nudge of nudges.slice(-5)) {
      const firstLine = (nudge.text ?? '').split('\n')[0];
      sections.push(`- ${firstLine}${nudge.resolved ? ' [resolved]' : ''}`);
    }
  }

  return sections.length > 0 ? sections.join('\n') : '(no recent activity — seed the space first)';
};

const MORNING_BRIEFING_SYSTEM = `
You are a personal executive assistant narrating what has happened across a software team's
work tools overnight. You write ONE tight paragraph (90-130 words) in a warm but efficient
voice. Lead with the single most important thing. Reference specific names, PR numbers,
meeting titles — be concrete. Do not use bullet points, headings, or lists.
Do not greet the user. Do not sign off. Just the paragraph.
`.trim();

const FRIDAY_UPDATE_SYSTEM = `
You are drafting a concise end-of-week update for a software team (the reader is a
tech lead). Output valid GitHub-flavored markdown with these sections:

  ## Shipped this week
  - bullets citing PR numbers and the card they closed

  ## Decisions & changes
  - bullets of strategic decisions or scope shifts captured in meeting notes

  ## Still open
  - bullets of cards that are in progress or blocked, with the likely owner

  ## Heads-up for next week
  - 2-3 bullets of what to watch

Be specific. Cite names, PR numbers, card titles. If a section has nothing,
write "_Nothing this week._" rather than padding. Total length: 200-300 words.
`.trim();

const AGENT_CHAT_NAME = 'Composer agent';

/**
 * Append an assistant message to the dedicated "Composer agent" Chat so it
 * appears in the chat pane and doesn't get mixed into Slack mirror chats.
 * Creates the Chat lazily the first time.
 */
const appendAssistantMessage = async (
  db: Database.Database,
  space: SpaceLike,
  text: string,
): Promise<AssistantChat.Chat | undefined> => {
  const chats = await db.query(Filter.type(AssistantChat.Chat)).run();
  let chat = chats.find((candidate) => candidate.name === AGENT_CHAT_NAME);
  if (!chat) {
    const feed = db.add(Feed.make());
    chat = AssistantChat.make({ name: AGENT_CHAT_NAME, feed: Ref.make(feed) });
    Obj.setParent(feed, chat);
    db.add(chat);
    await addToDemoCollection(db, chat);
  }
  const feedTarget = chat.feed?.target;
  if (!feedTarget) {
    return undefined;
  }
  const queueDxn = Feed.getQueueDxn(feedTarget);
  if (!queueDxn) {
    return undefined;
  }
  const queue = space.queues.get(queueDxn);
  if (!queue) {
    return undefined;
  }
  await queue.append([
    Obj.make(Message.Message, {
      created: new Date().toISOString(),
      sender: { role: 'assistant' },
      blocks: [{ _tag: 'text', text }],
      properties: { synthesis: 'demo' },
    }),
  ]);
  return chat;
};

export const generateMorningBriefing = async (
  db: Database.Database,
  space: SpaceLike,
): Promise<Markdown.Document> => {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in localStorage');
  }
  const context = await gatherContext(db);
  const briefing = await callClaude(
    apiKey,
    MORNING_BRIEFING_SYSTEM,
    `Here is what happened across the team's work tools overnight:\n\n${context}\n\nWrite the briefing paragraph.`,
  );
  // Emit as a Markdown.Document so it renders properly in the deck.
  // Markdown.Document's article surface is the reliable render path.
  const document = Markdown.make({
    name: `☀️ Morning briefing — ${new Date().toISOString().slice(0, 10)}`,
    content: `# Morning briefing\n\n_Generated ${new Date().toLocaleString()}_\n\n${briefing}\n`,
  });
  db.add(document);
  await addToDemoCollection(db, document);
  // Also append to the dedicated Composer agent chat for the phone-to-home
  // story beat.
  await appendAssistantMessage(db, space, `☀️ **Morning briefing**\n\n${briefing}`);
  log.info('demo: morning briefing generated', { chars: briefing.length });
  return document;
};

export const generateFridayUpdate = async (
  db: Database.Database,
  space: SpaceLike,
): Promise<Markdown.Document | undefined> => {
  const apiKey = readApiKey();
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set in localStorage');
  }
  const context = await gatherContext(db);
  const doc = await callClaude(
    apiKey,
    FRIDAY_UPDATE_SYSTEM,
    `Team activity this week:\n\n${context}\n\nDraft the update.`,
  );
  const document = Markdown.make({
    name: `Weekly update — ${new Date().toISOString().slice(0, 10)}`,
    content: doc,
  });
  db.add(document);
  await addToDemoCollection(db, document);
  await appendAssistantMessage(
    db,
    space,
    `📝 **Weekly update drafted** — see the new document "${document.name}" in the sidebar.`,
  );
  log.info('demo: weekly update drafted', { docId: document.id, chars: doc.length });
  return document;
};
