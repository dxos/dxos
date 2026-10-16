//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { BrainCrawlProtocol } from '@dxos/protocols';

//
// Fake EDGE crawl host: the brain back-index routes (`/compute/brain/:spaceId/:agentId/crawl`) for a scripted story.
//

/** The verbs the fake received, oldest first; `route` is `''`, `/pause`, `/resume` or `/reset`. */
export type FakeCrawlCall = { method: string; route: string; agentId: string; body?: unknown };

export type FakeCrawl = {
  calls: FakeCrawlCall[];
  /** What the next GET would answer, without stepping the crawl. */
  status: () => BrainCrawlProtocol.CrawlStatus;
  restore: () => void;
};

const CRAWL_PATH = /\/compute\/brain\/[^/]+\/([^/]+)\/crawl(\/pause|\/resume|\/reset)?$/;

/** Messages and facts one step of an active target reads and extracts. */
const MESSAGES_PER_STEP = 25;
const FACTS_PER_STEP = 4;

const json = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } });

const failure = (message: string, status: number) =>
  new Response(JSON.stringify({ success: false, error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const channelTarget = (channelId: string): BrainCrawlProtocol.CrawlTarget => ({
  id: `channel:${channelId}`,
  channelId,
  depth: 0,
  status: 'pending',
});

const threadTarget = (parent: BrainCrawlProtocol.CrawlTarget): BrainCrawlProtocol.CrawlTarget => ({
  id: `thread:${parent.channelId}:1`,
  channelId: parent.channelId,
  threadId: `${parent.channelId}1`,
  parentMessageId: `${parent.channelId}-m1`,
  depth: parent.depth + 1,
  status: 'pending',
});

/** A target crawled again from the start: no cursor, never run. */
const rewound = ({
  cursor: _cursor,
  lastRunAt: _lastRunAt,
  lastError: _lastError,
  ...target
}: BrainCrawlProtocol.CrawlTarget) => ({
  ...target,
  status: 'pending' as const,
});

/**
 * Stands in for EDGE's crawl routes by wrapping `fetch`. Each GET while running steps the first unfinished target
 * (pending → active → done), so a poller sees the crawl advance; a finished channel spawns one thread when the config
 * descends threads, and the crawl is done once every target is. EDGE's `/auth` challenge answers 404 so the client
 * proceeds unauthenticated instead of reaching a real EDGE.
 */
export const installFakeCrawl = (): FakeCrawl => {
  const original = globalThis.fetch;
  const calls: FakeCrawlCall[] = [];
  let state: BrainCrawlProtocol.CrawlStatus = {
    runStatus: 'idle',
    summary: { done: false, errored: 0 },
    targets: [],
    facts: 0,
    messages: 0,
  };
  let step = 0;

  const withSummary = (next: BrainCrawlProtocol.CrawlStatus): BrainCrawlProtocol.CrawlStatus => {
    const done = next.targets.length > 0 && next.targets.every(({ status }) => status === 'done');
    return {
      ...next,
      runStatus: next.runStatus === 'running' && done ? 'done' : next.runStatus,
      summary: { done, errored: next.targets.filter(({ status }) => status === 'error').length },
    };
  };

  const advance = () => {
    const index = state.targets.findIndex(({ status }) => status === 'pending' || status === 'active');
    if (state.runStatus !== 'running' || index < 0) {
      state = withSummary(state);
      return;
    }

    step++;
    const now = new Date().toISOString();
    const target = state.targets[index];
    const read: BrainCrawlProtocol.CrawlTarget = {
      ...target,
      status: target.status === 'pending' ? 'active' : 'done',
      cursor: `m${step}`,
      lastRunAt: now,
    };
    const config = state.config;
    const descend =
      read.status === 'done' &&
      config?.descendThreads &&
      read.depth < (config.maxDepth ?? Number.POSITIVE_INFINITY) &&
      !state.targets.some(({ id }) => id === threadTarget(read).id);
    state = withSummary({
      ...state,
      targets: [
        ...state.targets.slice(0, index),
        read,
        ...state.targets.slice(index + 1),
        ...(descend ? [threadTarget(read)] : []),
      ],
      messages: state.messages + MESSAGES_PER_STEP,
      facts: state.facts + FACTS_PER_STEP,
      lastStepAt: now,
    });
  };

  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === '/auth') {
      return new Response(null, { status: 404 });
    }

    const match = url.pathname.match(CRAWL_PATH);
    if (!match) {
      return original(input, init);
    }

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const agentId = decodeURIComponent(match[1]);
    const route = match[2] ?? '';
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, route, agentId, body });

    switch (`${method} ${route}`) {
      case 'PUT ': {
        const request = Schema.decodeUnknownSync(BrainCrawlProtocol.PutCrawlRequest)(body);
        const { descendThreads = true, ...rest } = request;
        // Kept per channel, as EDGE keeps a channel's cursor across a config change.
        const targets = request.channels.flatMap((channelId) => {
          const held = state.targets.filter((target) => target.channelId === channelId);
          return held.length > 0 ? held : [channelTarget(channelId)];
        });
        state = withSummary({ ...state, config: { ...rest, descendThreads }, targets, runStatus: 'running' });
        break;
      }
      case 'GET ': {
        advance();
        break;
      }
      case 'POST /pause': {
        state = { ...state, runStatus: 'paused' };
        break;
      }
      case 'POST /resume': {
        state = withSummary({ ...state, runStatus: 'running' });
        break;
      }
      case 'POST /reset': {
        const requested = Schema.decodeUnknownSync(BrainCrawlProtocol.ResetCrawlRequest)(body ?? {});
        const reset = new Set(requested.targets ?? state.targets.map(({ id }) => id));
        state = withSummary({
          ...state,
          runStatus: state.runStatus === 'paused' ? 'paused' : 'running',
          targets: state.targets.map((target) => (reset.has(target.id) ? rewound(target) : target)),
        });
        break;
      }
      default:
        return failure(`Unexpected ${method} ${url.pathname}.`, 405);
    }
    return json(state);
  };

  return {
    calls,
    status: () => state,
    restore: () => {
      globalThis.fetch = original;
    },
  };
};
