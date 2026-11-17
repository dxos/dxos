//
// Copyright 2026 DXOS.org
//

import { type Extracted, extractSentence, splitSentences, subjectOf } from './extract.ts';
import { contentHash, cosine, embed, seededRandom, tokenize, ulid } from './text.ts';
import {
  type IncomingMemory,
  type ListOptions,
  type ListResult,
  type Memory,
  type Message,
  type Namespace,
  type Profile,
  type RecallOptions,
  type RecallResult,
  type ScoredCandidate,
} from './types.ts';

/** Raw transcript row: content-addressed, kept verbatim beside the memories for full-text search. */
export type MessageRow = {
  id: string;
  sessionId: string;
  role: Message['role'];
  content: string;
  timestamp: Date;
  deletedAt?: Date;
};

/** Memory row as the public `Memory` plus the columns the API never returns. */
export type MemoryRow = Memory & {
  topicKey: string;
  keywords: string[];
  searchQueries: string[];
  sourceMessageIds: string[];
  /** Absent for tasks: they are not embedded. */
  vector?: number[];
  supersedes?: string;
  supersededBy?: string;
  deletedAt?: Date;
};

export type Decision = 'insert' | 'supersede' | 'duplicate';

/** What one queued ingest job did, stage by stage, so the story can show the pipeline. */
export type IngestTrace = {
  sessionId: string;
  messages: { stored: MessageRow[]; skipped: number };
  extracted: Extracted[];
  decisions: { item: Extracted; decision: Decision; memoryId: string; previousId?: string }[];
};

export type Retriever = 'keyword' | 'topic' | 'vector' | 'messages';

export const RETRIEVERS: Retriever[] = ['keyword', 'topic', 'vector', 'messages'];

/** Recall with the per-retriever ranks that fed the fused score. */
export type RecallTrace = RecallResult & {
  analysis: { terms: string[]; topics: string[] };
  ranks: Record<string, Partial<Record<Retriever, number>>>;
};

type Job = { messages: Message[]; sessionId: string };

const RRF_K = 60;

const PER_RETRIEVER: Record<NonNullable<RecallOptions['thinkingLevel']>, number> = { low: 5, medium: 10, high: 25 };

const ANSWER_SIZE: Record<NonNullable<RecallOptions['responseLength']>, number> = { short: 1, medium: 3, long: 6 };

const toMemory = ({ id, type, summary, content, sessionId, createdAt, updatedAt }: MemoryRow): Memory => ({
  id,
  type,
  summary,
  content,
  sessionId,
  createdAt,
  updatedAt,
});

/**
 * Reference model of one Agent Memory profile, built from the documented pipeline
 * (extract → classify → dedupe → store; analyze → retrieve ×4 → fuse → synthesize).
 * `ingest()` only enqueues, as the real service does; `drain()` is the consumer.
 */
export class ReferenceProfile implements Profile {
  readonly #messages = new Map<string, MessageRow>();
  readonly #memories = new Map<string, MemoryRow>();
  readonly #queue: Job[] = [];
  readonly #random: () => number;
  readonly #now: () => Date;
  readonly #listeners = new Set<() => void>();

  constructor(
    readonly key: string,
    { seed = 1, now = () => new Date() }: { seed?: number; now?: () => Date } = {},
  ) {
    this.#random = seededRandom(seed);
    this.#now = now;
  }

  get pending(): number {
    return this.#queue.length;
  }

  /** Every row, superseded and deleted included, for inspection. */
  tables(): { messages: MessageRow[]; memories: MemoryRow[] } {
    return { messages: [...this.#messages.values()], memories: [...this.#memories.values()] };
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async ingest(messages: Iterable<Message>, options: { sessionId?: string | null } = {}): Promise<void> {
    const list = [...messages];
    if (list.length > 500) {
      throw new Error('At most 500 messages per ingest() call.');
    }
    const sessionId = options.sessionId ?? `s_${contentHash(list.map((message) => message.content).join('\n'))}`;
    this.#queue.push({ messages: list, sessionId });
    this.#notify();
  }

  /** Runs every queued job; the real service does this asynchronously after `ingest()` resolves. */
  drain(): IngestTrace[] {
    const traces: IngestTrace[] = [];
    while (this.#queue.length > 0) {
      const job = this.#queue.shift();
      if (job) {
        traces.push(this.#process(job));
      }
    }
    this.#notify();
    return traces;
  }

  async remember({ content, sessionId = null }: IncomingMemory): Promise<Memory> {
    const now = this.#now();
    const item = extractSentence(content, { subject: 'User', timestamp: now }) ?? {
      type: 'fact' as const,
      topicKey: `note.${contentHash(content).slice(0, 8)}`,
      summary: content.length > 80 ? `${content.slice(0, 77)}...` : content,
      content,
      keywords: tokenize(content),
      searchQueries: [],
    };
    const { memoryId } = this.#store(item, sessionId, [], now);
    this.#notify();
    return toMemory(this.#row(memoryId));
  }

  async get(memoryId: string): Promise<Memory> {
    return toMemory(this.#row(memoryId));
  }

  async delete(memoryId: string): Promise<Memory> {
    const row = this.#row(memoryId);
    const now = this.#now();
    row.deletedAt = now;
    for (const messageId of row.sourceMessageIds) {
      const message = this.#messages.get(messageId);
      if (message) {
        message.deletedAt = now;
      }
    }
    this.#notify();
    return toMemory(row);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const now = this.#now();
    for (const row of [...this.#memories.values(), ...this.#messages.values()]) {
      if (row.sessionId === sessionId) {
        row.deletedAt ??= now;
      }
    }
    this.#notify();
  }

  async list({ limit = 20, cursor, sessionId, type }: ListOptions = {}): Promise<ListResult> {
    const rows = this.#active()
      .filter((row) => (sessionId === undefined || row.sessionId === sessionId) && (!type || row.type === type))
      .sort((left, right) => (left.id < right.id ? 1 : -1));
    const start = cursor ? rows.findIndex((row) => row.id < cursor) : 0;
    const page = start < 0 ? [] : rows.slice(start, start + limit);
    const next = start >= 0 && start + limit < rows.length ? page[page.length - 1]?.id : undefined;
    return {
      memories: page.map(({ id, type, summary, sessionId: session, createdAt, updatedAt }) => ({
        id,
        type,
        summary,
        sessionId: session,
        createdAt,
        updatedAt,
      })),
      cursor: next,
    };
  }

  async recall(query: string, options: RecallOptions = {}): Promise<RecallResult> {
    const { analysis: _analysis, ranks: _ranks, ...result } = this.recallTrace(query, options);
    return result;
  }

  /** `recall()` with its query analysis and per-retriever ranks exposed. */
  recallTrace(
    query: string,
    { thinkingLevel = 'low', responseLength = 'medium', referenceDate }: RecallOptions = {},
  ): RecallTrace {
    if (new TextEncoder().encode(query).length > 1024) {
      throw new Error('Recall query exceeds 1 KB.');
    }
    const terms = [...new Set(tokenize(query))];
    const active = this.#active();
    const topics = [
      ...new Set(
        active
          .map((row) => row.topicKey)
          .filter((topicKey) => terms.some((term) => tokenize(topicKey.replace(/[.-]/g, ' ')).includes(term))),
      ),
    ];
    const depth = PER_RETRIEVER[thinkingLevel];
    const queryVector = embed(query);

    const ranked: Record<Retriever, string[]> = {
      keyword: rank(active, (row) => overlap(terms, [...row.keywords, ...tokenize(row.summary)]), depth),
      topic: rank(active, (row) => (topics.includes(row.topicKey) ? 1 : 0), depth),
      vector: rank(
        active.filter((row) => row.vector),
        (row) => {
          const similarity = row.vector ? cosine(queryVector, row.vector) : 0;
          return similarity > 0.3 ? similarity : 0;
        },
        depth,
      ),
      messages: this.#messageHits(terms, active, depth),
    };

    const ranks: RecallTrace['ranks'] = {};
    for (const retriever of RETRIEVERS) {
      ranked[retriever].forEach((id, index) => {
        (ranks[id] ??= {})[retriever] = index + 1;
      });
    }
    const best = RETRIEVERS.length / (RRF_K + 1);
    const candidates: ScoredCandidate[] = Object.entries(ranks)
      .map(([id, byRetriever]) => {
        const row = this.#row(id);
        const fused = Object.values(byRetriever).reduce((sum, position) => sum + 1 / (RRF_K + position), 0);
        return { id, summary: row.summary, sessionId: row.sessionId, score: round(fused / best) };
      })
      .sort((left, right) => right.score - left.score);

    const anchor = referenceDate ? new Date(referenceDate) : this.#now();
    // Only candidates close to the best one feed the answer; weak matches stay in `candidates` as evidence.
    const cutoff = (candidates[0]?.score ?? 0) * 0.6;
    const answer = candidates
      .filter((candidate) => candidate.score >= cutoff)
      .slice(0, ANSWER_SIZE[responseLength])
      .map(({ id }) => this.#phrase(this.#row(id), anchor, responseLength === 'long'))
      .join(' ');

    return { count: candidates.length, answer, candidates, analysis: { terms, topics }, ranks };
  }

  async getSummary({ sessionId }: { sessionId?: string | null } = {}): Promise<{ summary: string }> {
    const active = this.#active();
    const section = (title: string, rows: MemoryRow[]) =>
      rows.length ? [`### ${title}`, ...rows.map((row) => `- ${row.summary}`), ''] : [];
    const last =
      sessionId ?? [...this.#messages.values()].sort((left, right) => +right.timestamp - +left.timestamp)[0]?.sessionId;
    const lines = [
      '## Summary',
      '',
      ...section(
        'Facts',
        active.filter((row) => row.type === 'fact'),
      ),
      ...section(
        'Instructions',
        active.filter((row) => row.type === 'instruction'),
      ),
      ...section(
        'Open tasks',
        active.filter((row) => row.type === 'task'),
      ),
      ...section(
        `Last Session (${last ?? 'none'})`,
        active.filter((row) => row.sessionId === last && row.type === 'event'),
      ),
    ];
    return { summary: lines.join('\n').trim() };
  }

  #process({ messages, sessionId }: Job): IngestTrace {
    const trace: IngestTrace = { sessionId, messages: { stored: [], skipped: 0 }, extracted: [], decisions: [] };
    const fresh: MessageRow[] = [];
    for (const message of messages) {
      const id = `m_${contentHash(`${sessionId}\u0000${message.role}\u0000${message.content}`)}`;
      if (this.#messages.has(id)) {
        trace.messages.skipped++;
        continue;
      }
      const row: MessageRow = {
        id,
        sessionId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp ?? this.#now(),
      };
      this.#messages.set(id, row);
      fresh.push(row);
    }
    trace.messages.stored = fresh;

    const known = [...this.#messages.values()].filter((row) => row.role === 'user');
    const subject = subjectOf(
      known.flatMap((row) => splitSentences(row.content)),
      'The user',
    );
    for (const message of fresh.filter((row) => row.role === 'user')) {
      for (const sentence of splitSentences(message.content)) {
        const item = extractSentence(sentence, { subject, timestamp: message.timestamp });
        if (item) {
          trace.extracted.push(item);
          trace.decisions.push({ item, ...this.#store(item, sessionId, [message.id], message.timestamp) });
        }
      }
    }
    return trace;
  }

  #store(
    item: Extracted,
    sessionId: string | null,
    sourceMessageIds: string[],
    at: Date,
  ): { decision: Decision; memoryId: string; previousId?: string } {
    const current = this.#active().find((row) => row.topicKey === item.topicKey);
    if (current && (current.summary === item.summary || item.type === 'event' || item.type === 'task')) {
      current.sourceMessageIds = [...new Set([...current.sourceMessageIds, ...sourceMessageIds])];
      return { decision: 'duplicate', memoryId: current.id };
    }
    const row: MemoryRow = {
      id: ulid(at.getTime(), this.#random),
      type: item.type,
      summary: item.summary,
      content: item.content,
      sessionId,
      createdAt: at,
      updatedAt: at,
      topicKey: item.topicKey,
      keywords: item.keywords,
      searchQueries: item.searchQueries,
      sourceMessageIds,
      vector: item.type === 'task' ? undefined : embed(`${item.summary} ${item.searchQueries.join(' ')}`),
      supersedes: current?.id,
    };
    this.#memories.set(row.id, row);
    if (current) {
      current.supersededBy = row.id;
      current.updatedAt = at;
      return { decision: 'supersede', memoryId: row.id, previousId: current.id };
    }
    return { decision: 'insert', memoryId: row.id };
  }

  #messageHits(terms: string[], active: MemoryRow[], depth: number): string[] {
    const scores = new Map<string, number>();
    for (const message of this.#messages.values()) {
      if (message.deletedAt) {
        continue;
      }
      const score = overlap(terms, tokenize(message.content));
      if (score === 0) {
        continue;
      }
      for (const row of active) {
        if (row.sourceMessageIds.includes(message.id)) {
          scores.set(row.id, Math.max(scores.get(row.id) ?? 0, score));
        }
      }
    }
    return rank(active, (row) => scores.get(row.id) ?? 0, depth);
  }

  #phrase(row: MemoryRow, anchor: Date, withHistory: boolean): string {
    let text = `${row.summary}.`;
    if (row.type === 'event' && !/\d{4}-\d{2}-\d{2}/.test(row.summary)) {
      const days = Math.round((Date.parse(isoDay(anchor)) - Date.parse(isoDay(row.createdAt))) / 86_400_000);
      text = `${row.summary} (${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}).`;
    }
    if (withHistory && row.supersedes) {
      text += ` Previously: ${this.#row(row.supersedes).summary}.`;
    }
    return text;
  }

  #active(): MemoryRow[] {
    return [...this.#memories.values()].filter((row) => !row.deletedAt && !row.supersededBy);
  }

  #row(memoryId: string): MemoryRow {
    const row = this.#memories.get(memoryId);
    if (!row || row.deletedAt) {
      throw new Error(`Memory not found: ${memoryId}`);
    }
    return row;
  }

  #notify(): void {
    for (const listener of this.#listeners) {
      listener();
    }
  }
}

/** Profiles keyed by `namespaceId:profileName`, the compound key the workers-types doc comment names. */
export class ReferenceNamespace implements Namespace {
  readonly #profiles = new Map<string, ReferenceProfile>();

  constructor(
    readonly namespaceId: string,
    readonly options: { seed?: number; now?: () => Date } = {},
  ) {}

  async getProfile(profileName: string): Promise<ReferenceProfile> {
    if (profileName.length > 100) {
      throw new Error('Profile name exceeds 100 characters.');
    }
    const key = `${this.namespaceId}:${profileName}`;
    let profile = this.#profiles.get(key);
    if (!profile) {
      profile = new ReferenceProfile(key, this.options);
      this.#profiles.set(key, profile);
    }
    return profile;
  }

  async deleteProfile(profileName: string): Promise<void> {
    this.#profiles.delete(`${this.namespaceId}:${profileName}`);
  }
}

const overlap = (terms: string[], tokens: string[]) => terms.filter((term) => tokens.includes(term)).length;

const rank = (rows: MemoryRow[], score: (row: MemoryRow) => number, depth: number): string[] =>
  rows
    .map((row) => ({ id: row.id, value: score(row) }))
    .filter(({ value }) => value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, depth)
    .map(({ id }) => id);

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const round = (value: number) => Math.round(value * 100) / 100;
