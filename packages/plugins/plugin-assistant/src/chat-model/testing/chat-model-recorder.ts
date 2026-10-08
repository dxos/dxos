//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import type * as Trace from '@dxos/compute/Trace';
import { type ContentBlock, type Message } from '@dxos/types';

import { type ChatModel } from '../chat-model.ts';
import { type ThreadProjection } from '../thread.ts';

/** The observable outputs of a {@link ChatModel} the UI binds to, plus the agent's own view of its turn. */
export type ChatModelSignal = 'active' | 'streaming' | 'activity' | 'error' | 'thread' | 'agent';

/** One change to one signal, as the UI would have seen it. */
export type ChatModelEvent = {
  /** Milliseconds since the recorder was attached. */
  readonly at: number;
  readonly signal: ChatModelSignal;
  /** Compact rendering of the new value, stable enough to assert on. */
  readonly value: string;
};

/** A moment at which the indicators disagreed with the work in flight. */
export type ChatModelViolation = {
  readonly at: number;
  readonly rule: string;
  readonly state: Readonly<Record<ChatModelSignal, string>>;
};

export type ChatModelRecorderOptions = {
  /**
   * The agent session's `running` atom. Recorded as the `agent` signal and checked against `active`:
   * an agent working while the chat reads idle is exactly the missing-indicator failure.
   */
  readonly agentRunning?: Atom.Atom<boolean>;
  /** Clock for {@link ChatModelEvent.at}; injectable so a report can share a time base. */
  readonly now?: () => number;
};

const IDLE = '-';
const UNSET = '';

/**
 * Records every change to a {@link ChatModel}'s indicator atoms as an ordered event log and checks
 * the indicator invariants after each burst of changes.
 *
 * Invariants are evaluated on a microtask rather than per write: the chat model settles several atoms
 * in one synchronous sequence (e.g. `active` then `activity`), which React renders as one frame, so
 * only a state that survives the burst is one a reader could see.
 */
export class ChatModelRecorder {
  readonly events: ChatModelEvent[] = [];
  readonly violations: ChatModelViolation[] = [];

  readonly #registry: AtomRegistry.AtomRegistry;
  readonly #now: () => number;
  readonly #start: number;
  // Unset rather than idle, so each signal's initial value is the first event in its log.
  readonly #state: Record<ChatModelSignal, string> = {
    active: UNSET,
    streaming: UNSET,
    activity: UNSET,
    error: UNSET,
    thread: UNSET,
    agent: UNSET,
  };
  readonly #unsubscribers: (() => void)[] = [];
  readonly #listeners = new Set<() => void>();
  #checkScheduled = false;

  constructor(registry: AtomRegistry.AtomRegistry, chatModel: ChatModel, options: ChatModelRecorderOptions = {}) {
    this.#registry = registry;
    this.#now = options.now ?? (() => performance.now());
    this.#start = this.#now();
    this.#watch('active', chatModel.active, String);
    this.#watch('streaming', chatModel.streaming, String);
    this.#watch('activity', chatModel.activity, formatActivity);
    this.#watch('error', chatModel.error, (error) =>
      Option.match(error, { onNone: () => IDLE, onSome: (error) => error.message }),
    );
    this.#watch('thread', chatModel.thread, formatThread);
    if (options.agentRunning) {
      this.#watch('agent', options.agentRunning, (running) => (running ? 'running' : 'idle'));
    }
  }

  /** The latest value of every signal. */
  get state(): Readonly<Record<ChatModelSignal, string>> {
    return { ...this.#state };
  }

  /** The log as `signal=value` lines, optionally narrowed to some signals. */
  lines(signals?: readonly ChatModelSignal[]): string[] {
    return this.events
      .filter((event) => !signals || signals.includes(event.signal))
      .map(({ signal, value }) => `${signal}=${value}`);
  }

  /** Distinct consecutive values a signal took, from its first recorded value. */
  values(signal: ChatModelSignal): string[] {
    return this.events.filter((event) => event.signal === signal).map(({ value }) => value);
  }

  /** When `signal` first took `value` (or first changed, without one), relative to attach. */
  firstAt(signal: ChatModelSignal, value?: string | ((value: string) => boolean)): number | undefined {
    const match =
      value === undefined
        ? () => true
        : typeof value === 'function'
          ? value
          : (candidate: string) => candidate === value;
    return this.events.find((event) => event.signal === signal && match(event.value))?.at;
  }

  /** Milliseconds since the recorder was attached. */
  elapsed(): number {
    return this.#now() - this.#start;
  }

  /** Resolves once `predicate` holds for the current state (checked now and after every change). */
  until(predicate: (state: Readonly<Record<ChatModelSignal, string>>) => boolean, timeout = 30_000): Promise<void> {
    return new Promise((resolve, reject) => {
      const check = () => {
        if (predicate(this.#state)) {
          cleanup();
          resolve();
        }
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`ChatModelRecorder.until timed out; state=${JSON.stringify(this.#state)}`));
      }, timeout);
      const cleanup = () => {
        clearTimeout(timer);
        this.#listeners.delete(check);
      };
      this.#listeners.add(check);
      check();
    });
  }

  /** Resolves once the chat model has been active and is idle again. */
  untilSettled(timeout?: number): Promise<void> {
    return this.until((state) => this.values('active').includes('true') && state.active === 'false', timeout);
  }

  dispose(): void {
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribers.length = 0;
    this.#listeners.clear();
  }

  #watch<T>(signal: ChatModelSignal, atom: Atom.Atom<T>, format: (value: T) => string): void {
    this.#unsubscribers.push(
      this.#registry.subscribe(
        atom,
        (value) => {
          const formatted = format(value);
          if (formatted === this.#state[signal]) {
            return;
          }
          this.#state[signal] = formatted;
          this.events.push({ at: Math.round(this.elapsed()), signal, value: formatted });
          this.#scheduleCheck();
          this.#listeners.forEach((listener) => listener());
        },
        // Mounts the atom: the chat model's derived atoms hold no state until something reads them.
        { immediate: true },
      ),
    );
  }

  #scheduleCheck(): void {
    if (this.#checkScheduled) {
      return;
    }
    this.#checkScheduled = true;
    queueMicrotask(() => {
      this.#checkScheduled = false;
      this.#check();
    });
  }

  #check(): void {
    const state = this.#state;
    const fail = (rule: string) => this.violations.push({ at: Math.round(this.elapsed()), rule, state: { ...state } });
    if (state.streaming === 'true' && state.active !== 'true') {
      fail('streaming while inactive');
    }
    if (state.activity !== IDLE && state.active !== 'true') {
      fail('activity line while inactive');
    }
    if (state.active === 'true' && state.activity === IDLE) {
      fail('active without an activity line');
    }
    if (state.agent === 'running' && state.active !== 'true') {
      fail('agent running while chat reads idle');
    }
  }
}

const formatActivity = (activity: Trace.PayloadType<typeof Trace.RequestPhase> | undefined): string => {
  if (!activity) {
    return IDLE;
  }
  const detail = activity.detail ? `(${activity.detail})` : '';
  const attempt = activity.attempt !== undefined && activity.attempt > 1 ? `#${activity.attempt}` : '';
  return `${activity.phase}${detail}${attempt}`;
};

const MAX_TEXT = 24;

const formatBlock = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'text': {
      const text = block.text.replace(/\s+/g, ' ').trim();
      return JSON.stringify(text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}…` : text);
    }
    case 'toolCall':
      return `call(${block.name})`;
    default:
      return block._tag;
  }
};

/** Blocks that carry bookkeeping rather than anything the reader sees in the turn. */
const HIDDEN_BLOCKS = new Set(['stats']);

const formatMessage = (message: Message.Message, thread: ThreadProjection): string | undefined => {
  const blocks = message.blocks.filter((block) => !HIDDEN_BLOCKS.has(block._tag));
  if (blocks.length === 0) {
    return undefined;
  }
  const delivery = thread.delivery.get(message.id);
  const role = message.sender.role ?? '?';
  const status = delivery ? `[${delivery.status}]` : '';
  return `${role}${status}:${blocks.map(formatBlock).join('+')}`;
};

/** One entry per visible row: the role, the delivery status of a prompt row, and its blocks. */
const formatThread = (thread: ThreadProjection): string => {
  const rows = thread.messages.flatMap((message) => formatMessage(message, thread) ?? []);
  return rows.length === 0 ? IDLE : rows.join(' | ');
};
