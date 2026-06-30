//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';

import { AiService } from '@dxos/ai';
import { SemanticStore } from '@dxos/semantic-index';

import { AgentRegistry } from '../AgentRegistry';
import { type Page, Source, type SourceApi, type ThreadRef } from '../Source';
import { StateStore } from '../StateStore';
import type * as Type from '../types';

// --- Fixture shape (a lean subset of plugin-discord's DiscordChannelFixture) -----------------------

export type FixtureMessage = {
  readonly 'id'?: string;
  readonly '@meta'?: { readonly keys?: ReadonlyArray<{ readonly source?: string; readonly id?: string }> };
  readonly 'created'?: string;
  readonly 'sender'?: { readonly name?: string };
  readonly 'blocks'?: ReadonlyArray<{ readonly _tag: string; readonly text?: string }>;
};

export type FixtureThread = {
  readonly state: { readonly channelId: string; readonly parentMessageId: string; readonly name?: string };
  readonly messages: readonly FixtureMessage[];
};

export type Fixture = {
  readonly state: { readonly channelId: string };
  readonly messages: readonly FixtureMessage[];
  readonly threads?: readonly FixtureThread[];
};

// --- FixtureSource --------------------------------------------------------------------------------

const messageId = (message: FixtureMessage): string => message['@meta']?.keys?.[0]?.id ?? message.id ?? '';

const messageText = (message: FixtureMessage): string =>
  (message.blocks ?? [])
    .filter((block) => block._tag === 'text' && block.text)
    .map((block) => block.text)
    .join('\n')
    .trim();

// Snowflakes sort numerically; fall back to string order for non-numeric ids (e.g. ULIDs).
const newerThan = (id: string, cursor: string): boolean => {
  try {
    return BigInt(id) > BigInt(cursor);
  } catch {
    return id > cursor;
  }
};

const toMessage = (message: FixtureMessage): Type.Message => {
  // Fixtures carry only a sender display name (no user id), so the name is the stable key here;
  // a live Discord source supplies author.id and the name becomes a mere alias.
  const name = message.sender?.name ?? 'unknown';
  return {
    id: messageId(message),
    text: messageText(message),
    author: { id: name, source: 'discord', displayName: name },
    createdAt: message.created,
  };
};

const page = (messages: readonly FixtureMessage[], cursor: string | undefined, threads: readonly ThreadRef[]): Page => {
  const sorted = [...messages].sort((left, right) => (newerThan(messageId(left), messageId(right)) ? 1 : -1));
  const fresh = cursor ? sorted.filter((message) => newerThan(messageId(message), cursor)) : sorted;
  const mapped = fresh.map(toMessage).filter((message) => message.id.length > 0);
  return {
    messages: mapped,
    cursor: mapped.length > 0 ? mapped[mapped.length - 1].id : undefined,
    threads,
  };
};

/** A {@link Source} that replays a captured fixture (no token, fully deterministic). */
export const makeFixtureSource = (fixture: Fixture): SourceApi => {
  const threadsById = new Map((fixture.threads ?? []).map((thread) => [thread.state.channelId, thread]));
  const channelThreadRefs: ThreadRef[] = (fixture.threads ?? []).map((thread) => ({
    threadId: thread.state.channelId,
    parentMessageId: thread.state.parentMessageId,
    name: thread.state.name,
  }));

  return {
    listChannels: () => Effect.succeed([{ id: fixture.state.channelId }]),
    fetchMessages: ({ channelId, cursor }) =>
      Effect.sync(() => {
        const thread = threadsById.get(channelId);
        if (thread) {
          return page(thread.messages, cursor, []);
        }
        return page(fixture.messages, cursor, channelThreadRefs);
      }),
  };
};

export const fixtureSourceLayer = (fixture: Fixture): Layer.Layer<Source> =>
  Layer.succeed(Source, makeFixtureSource(fixture));

// --- Deterministic (no-LLM) extractor -------------------------------------------------------------

const STOP_WORDS = new Set([
  'The',
  'This',
  'That',
  'These',
  'Those',
  'There',
  'Then',
  'They',
  'Their',
  'Them',
  'It',
  'Its',
  'Is',
  'Are',
  'Was',
  'Were',
  'Be',
  'But',
  'And',
  'Or',
  'If',
  'So',
  'Do',
  'Does',
  'Did',
  'Done',
  'Would',
  'Could',
  'Should',
  'Will',
  'Can',
  'May',
  'Might',
  'Must',
  'Have',
  'Has',
  'Had',
  'I',
  'We',
  'You',
  'He',
  'She',
  'My',
  'Your',
  'Our',
  'A',
  'An',
  'As',
  'At',
  'In',
  'On',
  'Of',
  'To',
  'For',
  'With',
  'From',
  'By',
  'Not',
  'No',
  'Yes',
  'Yeah',
  'Hi',
  'Hey',
  'Hello',
  'Thanks',
  'Thank',
  'Please',
  'Just',
  'Now',
  'How',
  'What',
  'When',
  'Where',
  'Why',
  'Who',
  'Which',
  'Maybe',
  'Also',
  'Some',
  'Any',
  'All',
  'One',
  'Two',
  'Sure',
  'Ok',
  'Okay',
  'Great',
  'Good',
  'Nice',
  'Got',
  'Get',
]);

/** Extract candidate proper-noun topics from text (deterministic stand-in for LLM NER). */
export const properNouns = (text: string, limit = 6): string[] => {
  const matches = text.match(/\b[A-Z][a-zA-Z][a-zA-Z0-9.]*\b/g) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of matches) {
    const word = match.replace(/\.$/, '');
    if (STOP_WORDS.has(word) || seen.has(word.toLowerCase())) {
      continue;
    }
    seen.add(word.toLowerCase());
    result.push(word);
    if (result.length >= limit) {
      break;
    }
  }
  return result;
};

const PROMPT_AUTHOR = /\nAuthor: (.*)\n/;
const PROMPT_MESSAGE = '\nMessage:\n';

/** Recover (author, text) from the extract stage's prompt and synthesize `(author) mentions (noun)` facts. */
const extractFromPrompt = (prompt: string) => {
  const author = PROMPT_AUTHOR.exec(prompt)?.[1] ?? 'unknown';
  const messageIndex = prompt.indexOf(PROMPT_MESSAGE);
  const text = messageIndex >= 0 ? prompt.slice(messageIndex + PROMPT_MESSAGE.length) : '';
  return {
    facts: properNouns(text).map((noun) => ({
      subject: author,
      predicate: 'mentions',
      object: noun,
      factuality: 'CT+',
      polarity: '+',
    })),
  };
};

/**
 * An {@link AiService} that extracts facts deterministically from the prompt instead of calling a
 * model — so the crawler builds a real fact graph from real message content with no token. Swap in
 * a live `AiService` to get model-quality extraction over the same pipeline.
 */
export const deterministicAiService = (): Layer.Layer<AiService.AiService> =>
  Layer.succeed(AiService.AiService, {
    // The @effect/ai LanguageModel surface is large and external; a test/offline fake fills only
    // the methods the pipeline calls.
    model: () =>
      Layer.succeed(LanguageModel.LanguageModel, {
        generateText: () => Effect.succeed({ text: '', content: [] }),
        generateObject: (request: { prompt: string }) =>
          Effect.succeed({ value: extractFromPrompt(request.prompt), content: [] }),
        streamText: () => Stream.empty,
      } as any),
  });

// --- Composed test layer + synthetic fixtures -----------------------------------------------------

/**
 * State + agent registry + semantic store, with NO `Source` and NO `AiService`. Compose with a
 * `Source` layer and an `AiService` (the deterministic stand-in or a real model) to run the crawler.
 */
export const coreLayer: Layer.Layer<StateStore | AgentRegistry | SemanticStore> = Layer.mergeAll(
  StateStore.layerMemory,
  AgentRegistry.layerMemory,
  SemanticStore.layerMemory,
);

/**
 * Everything the crawler needs EXCEPT a {@link Source}: {@link coreLayer} + the deterministic
 * extractor. Compose with any `Source` layer to run the crawler offline (no AI token).
 */
export const servicesLayer: Layer.Layer<StateStore | AgentRegistry | SemanticStore | AiService.AiService> = Layer.merge(
  coreLayer,
  deterministicAiService(),
);

/** All services the crawler needs, wired against a fixture + the deterministic extractor. */
export const TestLayer = (
  fixture: Fixture,
): Layer.Layer<Source | StateStore | AgentRegistry | SemanticStore | AiService.AiService> =>
  Layer.merge(fixtureSourceLayer(fixture), servicesLayer);

/** A channel with one message that spawns a thread — exercises depth-first descent + per-thread resume. */
export const THREADED_FIXTURE: Fixture = {
  state: { channelId: 'chan-1' },
  messages: [
    {
      '@meta': { keys: [{ source: 'discord.com', id: '1000' }] },
      'created': '2026-06-01T10:00:00.000Z',
      'sender': { name: 'Alice' },
      'blocks': [{ _tag: 'text', text: 'Should Composer use OPFS for local storage?' }],
    },
    {
      '@meta': { keys: [{ source: 'discord.com', id: '1001' }] },
      'created': '2026-06-01T10:05:00.000Z',
      'sender': { name: 'Bob' },
      'blocks': [{ _tag: 'text', text: 'DXOS already supports replication across peers.' }],
    },
  ],
  threads: [
    {
      state: { channelId: 'thread-1', parentMessageId: '1000', name: 'OPFS discussion' },
      messages: [
        {
          '@meta': { keys: [{ source: 'discord.com', id: '2000' }] },
          'created': '2026-06-01T10:10:00.000Z',
          'sender': { name: 'Carol' },
          'blocks': [{ _tag: 'text', text: 'OPFS gives Composer durable browser storage.' }],
        },
        {
          '@meta': { keys: [{ source: 'discord.com', id: '2001' }] },
          'created': '2026-06-01T10:12:00.000Z',
          'sender': { name: 'Alice' },
          'blocks': [{ _tag: 'text', text: 'Automerge compaction reduces OPFS growth.' }],
        },
      ],
    },
  ],
};
