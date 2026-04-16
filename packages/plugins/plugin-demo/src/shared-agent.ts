//
// Copyright 2026 DXOS.org
//

/**
 * Single-agent, cross-surface handler.
 *
 * Core idea: ONE Chat feed per Slack-linked channel is the authoritative
 * conversation. Both Slack and Composer read & write into it. One agent
 * (this module) responds to new user messages, using Claude with REAL
 * tools — not the processor's hallucinated tool_use simulacra.
 *
 * Tools implemented (real API calls):
 *   - query_trello_cards       — list cards on the demo board
 *   - trello_move_card         — move a card to a list by name
 *   - trello_create_card       — create a new card on the board
 *   - slack_post_message       — post to a Slack channel/thread
 *   - query_github_prs         — list recent merged PRs
 *   - query_granola_notes      — list recent meeting notes
 *
 * Invocation:
 *   startSharedAgent(db, space) is called from observers.ts. The observer
 *   polls every 3s, and for each Slack-linked chat whose feed has an
 *   un-responded user message, it runs the agent loop.
 */

import { Chat as AssistantChat } from '@dxos/assistant-toolkit';
import { type Database, Feed, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { GitHub } from '@dxos/plugin-github/types';
import { Granola } from '@dxos/plugin-granola/types';
import { Trello } from '@dxos/plugin-trello/types';
import { Message } from '@dxos/types';

import { Demo } from './types';

const ANTHROPIC_URL = '/api/anthropic/v1/messages';
const SLACK_API = 'https://slack.com/api';
const TRELLO_BASE = 'https://api.trello.com/1';
const MODEL = 'claude-sonnet-4-5';
const POLL_INTERVAL_MS = 3_000;

type SpaceLike = { queues: { get: (dxn: any) => any } };

let started = false;
const handledMessageIds = new Set<string>();

// ---------- tool definitions (Anthropic tool-use schema) --------------------

const tools = [
  {
    name: 'query_trello_cards',
    description: 'List the Trello cards on the Widgets Team demo board. Returns id, name, list, description.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'trello_move_card',
    description:
      'Move a Trello card to a list by name (one of: Backlog, In Progress, Review, Done). ' +
      'Uses the demo board. If the card name is ambiguous, prefer the closest case-insensitive match.',
    input_schema: {
      type: 'object' as const,
      properties: {
        card_name: { type: 'string', description: 'Exact or close match of the card name.' },
        list_name: { type: 'string', description: 'Target list name.' },
      },
      required: ['card_name', 'list_name'],
    },
  },
  {
    name: 'trello_create_card',
    description: 'Create a new Trello card on the Widgets Team demo board.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        list_name: {
          type: 'string',
          description: 'One of: Backlog, In Progress, Review, Done. Defaults to Backlog.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'slack_post_message',
    description:
      'Post a message to a Slack channel. Use sparingly — only when the user explicitly asks you to ' +
      'post something or ping someone in Slack. If you are already replying to a Slack @mention, your ' +
      'reply is posted automatically — do NOT call this tool for that.',
    input_schema: {
      type: 'object' as const,
      properties: {
        channel: { type: 'string', description: 'Slack channel name (without #) or channel ID.' },
        text: { type: 'string' },
      },
      required: ['channel', 'text'],
    },
  },
  {
    name: 'query_github_prs',
    description: 'List recent merged pull requests tracked in the space.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'query_granola_notes',
    description: 'List recent Granola meeting notes tracked in the space.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
];

// ---------- tool implementations -------------------------------------------

type ToolExecContext = {
  db: Database.Database;
  botToken: string | undefined;
};

const executeTool = async (
  ctx: ToolExecContext,
  name: string,
  input: Record<string, any>,
): Promise<string> => {
  try {
    switch (name) {
      case 'query_trello_cards':
        return await toolQueryTrelloCards(ctx.db);
      case 'trello_move_card':
        return await toolTrelloMoveCard(ctx.db, input.card_name, input.list_name);
      case 'trello_create_card':
        return await toolTrelloCreateCard(ctx.db, input.name, input.description, input.list_name);
      case 'slack_post_message':
        return await toolSlackPost(ctx.botToken, input.channel, input.text);
      case 'query_github_prs':
        return await toolQueryPrs(ctx.db);
      case 'query_granola_notes':
        return await toolQueryGranola(ctx.db);
      default:
        return `unknown tool: ${name}`;
    }
  } catch (err) {
    return `tool error: ${(err as Error).message}`;
  }
};

const toolQueryTrelloCards = async (db: Database.Database): Promise<string> => {
  const cards = await db.query(Filter.type(Trello.TrelloCard)).run();
  const open = cards.filter((card) => !card.closed);
  const summary = open.map((card) => ({
    id: card.id,
    trelloId: card.trelloCardId,
    name: card.name,
    list: card.listName ?? 'unknown',
    description: (card.description ?? '').slice(0, 300),
  }));
  return JSON.stringify(summary, null, 2);
};

const readTrelloAuth = (): { key: string; token: string; boardId: string } | undefined => {
  const key = globalThis.localStorage?.getItem('TRELLO_API_KEY');
  const token = globalThis.localStorage?.getItem('TRELLO_API_TOKEN');
  const boardId = globalThis.localStorage?.getItem('TRELLO_BOARD_ID');
  if (!key || !token || !boardId) {
    return undefined;
  }
  return { key, token, boardId };
};

const fetchTrelloLists = async (
  boardId: string,
  auth: { key: string; token: string },
): Promise<{ id: string; name: string }[]> => {
  const url = new URL(`${TRELLO_BASE}/boards/${boardId}/lists`);
  url.searchParams.set('key', auth.key);
  url.searchParams.set('token', auth.token);
  url.searchParams.set('fields', 'id,name');
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Trello lists ${response.status}`);
  }
  return response.json();
};

const toolTrelloMoveCard = async (
  db: Database.Database,
  cardName: string,
  listName: string,
): Promise<string> => {
  const cards = await db.query(Filter.type(Trello.TrelloCard)).run();
  const match = cards.find(
    (card) => (card.name ?? '').toLowerCase() === cardName.toLowerCase(),
  ) ?? cards.find((card) => (card.name ?? '').toLowerCase().includes(cardName.toLowerCase()));
  if (!match) {
    return `No card found matching "${cardName}".`;
  }
  // Update ECHO for immediate UI feedback.
  Obj.change(match, (mutable) => {
    mutable.listName = listName;
  });
  // Push to real Trello if credentials available.
  const auth = readTrelloAuth();
  if (auth && match.trelloCardId) {
    try {
      const lists = await fetchTrelloLists(auth.boardId, auth);
      const target = lists.find(
        (list) => list.name.toLowerCase() === listName.toLowerCase(),
      );
      if (target) {
        const url = new URL(`${TRELLO_BASE}/cards/${match.trelloCardId}`);
        url.searchParams.set('key', auth.key);
        url.searchParams.set('token', auth.token);
        url.searchParams.set('idList', target.id);
        const response = await fetch(url.toString(), { method: 'PUT' });
        if (!response.ok) {
          return `Moved locally but Trello API failed (${response.status}).`;
        }
        Obj.change(match, (mutable) => {
          mutable.trelloListId = target.id;
        });
        return `Moved "${match.name}" to ${listName}.`;
      }
    } catch (err) {
      return `Moved locally; Trello API threw: ${String(err)}`;
    }
  }
  return `Moved "${match.name}" to ${listName} (local-only; Trello creds not configured).`;
};

const toolTrelloCreateCard = async (
  db: Database.Database,
  name: string,
  description: string | undefined,
  listName: string | undefined,
): Promise<string> => {
  const targetList = listName ?? 'Backlog';
  const auth = readTrelloAuth();
  let trelloCardId = `local-${Date.now()}`;
  let trelloListId = `demo-list-${targetList.toLowerCase()}`;
  if (auth) {
    try {
      const lists = await fetchTrelloLists(auth.boardId, auth);
      const target = lists.find((list) => list.name.toLowerCase() === targetList.toLowerCase());
      if (target) {
        trelloListId = target.id;
        const url = new URL(`${TRELLO_BASE}/cards`);
        url.searchParams.set('key', auth.key);
        url.searchParams.set('token', auth.token);
        url.searchParams.set('idList', target.id);
        url.searchParams.set('name', name);
        if (description) {
          url.searchParams.set('desc', description);
        }
        const response = await fetch(url.toString(), { method: 'POST' });
        if (response.ok) {
          const created = (await response.json()) as { id: string };
          trelloCardId = created.id;
        }
      }
    } catch {
      // Fall through to local-only creation.
    }
  }
  const card = db.add(
    Obj.make(Trello.TrelloCard, {
      name,
      description: description ?? '',
      trelloCardId,
      trelloBoardId: auth?.boardId ?? 'demo-widgets-board',
      trelloListId,
      listName: targetList,
      position: Date.now(),
      closed: false,
      lastActivityAt: new Date().toISOString(),
    }),
  );
  return `Created card "${card.name}" in ${targetList}.`;
};

const toolSlackPost = async (
  botToken: string | undefined,
  channel: string,
  text: string,
): Promise<string> => {
  if (!botToken) {
    return 'SLACK_BOT_TOKEN not configured.';
  }
  const body = new URLSearchParams({ token: botToken, channel, text });
  const response = await fetch(`${SLACK_API}/chat.postMessage`, { method: 'POST', body });
  const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };
  if (!data.ok) {
    return `Slack post failed: ${data.error}`;
  }
  return `Posted to #${channel} (ts=${data.ts}).`;
};

const toolQueryPrs = async (db: Database.Database): Promise<string> => {
  const prs = await db.query(Filter.type(GitHub.GitHubPullRequest)).run();
  const summary = prs.map((pr) => ({
    number: pr.number,
    title: pr.title,
    author: pr.author,
    state: pr.state,
    merged: Boolean(pr.mergedAt),
  }));
  return JSON.stringify(summary.slice(-15), null, 2);
};

const toolQueryGranola = async (db: Database.Database): Promise<string> => {
  const notes = await db.query(Filter.type(Granola.GranolaSyncRecord)).run();
  const summary = notes.map((note) => ({
    title: note.document?.target?.name ?? '(untitled)',
    createdAt: note.createdAt,
  }));
  return JSON.stringify(summary.slice(-10), null, 2);
};

// ---------- agent loop -----------------------------------------------------

type AnthropicMessage =
  | { role: 'user'; content: string | Array<any> }
  | { role: 'assistant'; content: string | Array<any> };

const SYSTEM_PROMPT = [
  'You are composerclaw, the widgets team assistant. You have real tools to query and modify',
  'the team\'s Trello board, post to Slack, and read GitHub + meeting-note history.',
  '',
  'Rules:',
  '  - Prefer to ACT rather than just describe. If the user asks you to move, create, or assign,',
  '    call the corresponding tool.',
  '  - NEVER fabricate tool results. If you need data, call a query tool.',
  '  - When replying, be concrete and specific. Reference card names, PR numbers, meeting titles.',
  '  - Keep responses under 150 words unless the user explicitly asks for more detail.',
  '  - Do NOT use slack_post_message to reply to messages you are already answering — just respond',
  '    naturally. slack_post_message is for volunteer posts (e.g. "let the team know").',
].join('\n');

const callAnthropicWithTools = async (
  apiKey: string,
  ctx: ToolExecContext,
  historyMessages: AnthropicMessage[],
): Promise<string> => {
  let messages = [...historyMessages];
  for (let iteration = 0; iteration < 6; iteration += 1) {
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
        system: SYSTEM_PROMPT,
        tools,
        messages,
      }),
    });
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string; id?: string; name?: string; input?: any }>;
      stop_reason?: string;
      error?: { message: string };
    };
    if (!response.ok) {
      throw new Error(data.error?.message ?? `anthropic ${response.status}`);
    }
    const content = data.content ?? [];
    const toolUses = content.filter((block) => block.type === 'tool_use');
    if (toolUses.length === 0) {
      // Final assistant text response.
      return content
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text as string)
        .join('\n')
        .trim();
    }
    // Execute each tool call, then continue the loop.
    const toolResults = [];
    for (const toolUse of toolUses) {
      log.info('shared-agent: tool call', { tool: toolUse.name, input: toolUse.input });
      const result = await executeTool(ctx, toolUse.name!, toolUse.input ?? {});
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      });
    }
    messages = [
      ...messages,
      { role: 'assistant', content },
      { role: 'user', content: toolResults },
    ];
  }
  return '(tool loop exhausted)';
};

// ---------- observer -------------------------------------------------------

export const startSharedAgent = (db: Database.Database, space: SpaceLike): void => {
  if (started) {
    return;
  }
  started = true;
  log.info('shared-agent: starting');
  setInterval(() => void tick(db, space), POLL_INTERVAL_MS);
};

const tick = async (db: Database.Database, space: SpaceLike): Promise<void> => {
  const apiKey = globalThis.localStorage?.getItem('ANTHROPIC_API_KEY');
  const botToken = globalThis.localStorage?.getItem('SLACK_BOT_TOKEN');
  if (!apiKey) {
    return;
  }
  const links = await db.query(Filter.type(Demo.SlackChatLink)).run();
  for (const link of links) {
    try {
      const chat = link.chat?.target;
      if (!chat) {
        continue;
      }
      await handleChat(db, space, chat, link, apiKey, botToken ?? undefined);
    } catch (err) {
      log.info('shared-agent: tick entry failed', { error: String(err) });
    }
  }
};

const handleChat = async (
  db: Database.Database,
  space: SpaceLike,
  chat: AssistantChat.Chat,
  link: Demo.SlackChatLink,
  apiKey: string,
  botToken: string | undefined,
): Promise<void> => {
  const feedTarget = chat.feed?.target;
  if (!feedTarget) {
    return;
  }
  const queueDxn = Feed.getQueueDxn(feedTarget);
  if (!queueDxn) {
    return;
  }
  const queue = space.queues.get(queueDxn);
  if (!queue) {
    return;
  }
  const messages = ((await queue.queryObjects?.()) ?? []) as Message.Message[];
  if (messages.length === 0) {
    return;
  }
  const last = messages[messages.length - 1];
  if (last.sender?.role !== 'user') {
    return; // already replied
  }
  if (handledMessageIds.has(last.id)) {
    return;
  }
  handledMessageIds.add(last.id);

  const history = buildHistory(messages);
  try {
    const reply = await callAnthropicWithTools(apiKey, { db, botToken }, history);
    if (!reply) {
      return;
    }
    // Append reply as assistant message.
    await queue.append([
      Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant' },
        blocks: [{ _tag: 'text', text: reply }],
        properties: { source: 'shared-agent', inReplyTo: last.id },
      }),
    ]);
    // If the user message came from Slack (has slackTs), post the reply there too.
    const lastProps = (last.properties as Record<string, unknown> | undefined) ?? {};
    if (botToken && typeof lastProps.slackTs === 'string') {
      const threadTs = (lastProps.slackTs as string).endsWith('-reply')
        ? link.threadTs
        : (lastProps.slackTs as string);
      const body = new URLSearchParams({
        token: botToken,
        channel: link.channelId,
        text: reply,
        thread_ts: threadTs ?? link.threadTs,
      });
      await fetch(`${SLACK_API}/chat.postMessage`, { method: 'POST', body });
    }
    log.info('shared-agent: responded', { chatId: chat.id, replyChars: reply.length });
  } catch (err) {
    handledMessageIds.delete(last.id);
    log.warn('shared-agent: reply failed', { error: String(err) });
  }
};

const buildHistory = (messages: Message.Message[]): AnthropicMessage[] => {
  const out: AnthropicMessage[] = [];
  for (const msg of messages.slice(-20)) {
    const text = (msg.blocks ?? [])
      .filter((block: any) => block._tag === 'text' && typeof block.text === 'string')
      .map((block: any) => block.text as string)
      .join('\n')
      .trim();
    if (!text) {
      continue;
    }
    out.push({
      role: msg.sender?.role === 'assistant' ? 'assistant' : 'user',
      content: text,
    });
  }
  if (out.length === 0 || out[out.length - 1].role !== 'user') {
    return out; // should not happen — caller already verified last is user
  }
  return out;
};
