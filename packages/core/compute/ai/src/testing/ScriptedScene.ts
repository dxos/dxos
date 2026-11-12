//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as AiError from 'effect/ai/AiError';
import type * as Duration from 'effect/Duration';

import * as ScriptedLanguageModel from './ScriptedLanguageModel.ts';

/**
 * A scripted model written as the conversations it plays. Each conversation is one thread's dialogue: `user` turns are
 * matched against the thread's prompts, `tool` turns against what a tool returned, and `assistant` turns are what the
 * model sends back. Conversations keep their own place, so an agent and the subagents it starts run at once against one
 * model.
 *
 * A pattern is a substring, a RegExp (whose named groups are captured), or a template string with placeholders —
 * `` `Print me object ${objectId('object a')}` `` — that capture what stands in their place. The same placeholder in a
 * later turn of the conversation, in text or anywhere in a tool's input, is replaced with the captured value.
 */

/** Re-exported so a script needs `ScriptedScene` alone. */
export const text = ScriptedLanguageModel.text;
export const reasoning = ScriptedLanguageModel.reasoning;
export const toolCall = ScriptedLanguageModel.toolCall;

export type Pattern = string | RegExp;

export type Turn =
  | { readonly role: 'user' | 'tool'; readonly pattern: Pattern }
  | {
      readonly role: 'assistant';
      readonly parts: readonly ScriptedLanguageModel.ScriptedPart[];
      readonly delay?: Duration.Input;
    };

/** One thread's dialogue, named in errors. */
export type Conversation = { readonly name: string; readonly turns: readonly Turn[] };

/** Every conversation a scripted model plays, and how it is matched; built with {@link make}, played with {@link play}. */
export type Scene = { readonly conversations: readonly Conversation[]; readonly options: Options };

/** A side call the harness makes outside any conversation (naming a chat, a planning reminder), answered alike each time. */
export type Aside = {
  readonly name: string;
  readonly match: (request: ScriptedLanguageModel.ScriptedRequest) => boolean;
  readonly reply: string;
};

export type Options = {
  /** Side calls answered before any conversation is tried. */
  readonly asides?: readonly Aside[];
  /** The prompt a request answers; the text of the last user message unless a harness says otherwise. */
  readonly promptOf?: (request: ScriptedLanguageModel.ScriptedRequest) => string;
};

//
// Placeholders.
//

// Private-use characters delimit a placeholder, so it survives inside an ordinary template string and in JSON.
const OPEN = '\u{E000}';
const CLOSE = '\u{E001}';
const PLACEHOLDER = /\u{E000}([^\u{E001}]*)\u{E001}/gu;

/** What a placeholder captures, by kind; `capture` carries its own pattern. */
const KINDS: Record<string, string> = {
  capture: String.raw`[^\n]+`,
  objectId: String.raw`(?:echo:\/\/|dxn:echo:)[^\s"'()\[\]<>]+`,
  threadId: String.raw`[\w@-]+`,
};

const placeholder = (kind: string, name: string, source?: string): string =>
  `${OPEN}${JSON.stringify([kind, name, source ?? null])}${CLOSE}`;

/** Stands for an object's URI: captured in a pattern, written back in a later turn. */
export const objectId = (name: string): string => placeholder('objectId', name);

/** Stands for a thread's id, as `thread_delegate` reports it. */
export const threadId = (name: string): string => placeholder('threadId', name);

/**
 * Stands for whatever `pattern` matches (a line of text when omitted). In an assistant turn the pattern plays no part,
 * so `capture(name)` alone writes the captured value back.
 */
export const capture = (name: string, pattern?: RegExp): string => placeholder('capture', name, pattern?.source);

const parsePlaceholder = (body: string): { kind: string; name: string; source?: string } => {
  const [kind, name, source] = JSON.parse(body) as [string, string, string | null];
  return { kind, name, ...(source !== null ? { source } : {}) };
};

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

type Matcher = (value: string) => Record<string, string> | undefined;

/** Compiles a pattern into a test that returns what it captured, or nothing when it does not match. */
const compile = (pattern: Pattern): Matcher => {
  if (pattern instanceof RegExp) {
    return (value) => {
      const match = pattern.exec(value);
      return match ? { ...match.groups } : undefined;
    };
  }
  const names: string[] = [];
  let source = '';
  let last = 0;
  for (const match of pattern.matchAll(PLACEHOLDER)) {
    source += escape(pattern.slice(last, match.index));
    const { kind, name, source: own } = parsePlaceholder(match[1]);
    source += `(${own ?? KINDS[kind]})`;
    names.push(name);
    last = match.index + match[0].length;
  }
  source += escape(pattern.slice(last));
  const regex = new RegExp(source);
  return (value) => {
    const match = regex.exec(value);
    return match ? Object.fromEntries(names.map((name, index) => [name, match[index + 1]])) : undefined;
  };
};

class UnboundPlaceholder extends Error {}

/** Writes captured values over the placeholders in a string, failing on one never captured. */
const fill = (value: string, bindings: ReadonlyMap<string, string>): string =>
  value.replace(PLACEHOLDER, (_, body: string) => {
    const { name } = parsePlaceholder(body);
    const bound = bindings.get(name);
    if (bound === undefined) {
      throw new UnboundPlaceholder(`"${name}" is used before any turn captured it`);
    }
    return bound;
  });

/** {@link fill} over every string in a tool's input. */
const fillDeep = (value: unknown, bindings: ReadonlyMap<string, string>): unknown => {
  if (typeof value === 'string') {
    return fill(value, bindings);
  }
  if (Array.isArray(value)) {
    return value.map((item) => fillDeep(item, bindings));
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, fillDeep(item, bindings)]));
  }
  return value;
};

const fillPart = (
  part: ScriptedLanguageModel.ScriptedPart,
  bindings: ReadonlyMap<string, string>,
): ScriptedLanguageModel.ScriptedPart => {
  if (part._tag === 'toolCall') {
    const { input } = part;
    return {
      ...part,
      input:
        typeof input === 'function'
          ? (request: ScriptedLanguageModel.ScriptedRequest) => fillDeep(input(request), bindings)
          : fillDeep(input, bindings),
    };
  }
  const { text } = part;
  return {
    ...part,
    text:
      typeof text === 'function'
        ? (request: ScriptedLanguageModel.ScriptedRequest) => fill(text(request), bindings)
        : fill(text, bindings),
  };
};

//
// Builders.
//

export const make = (conversations: readonly Conversation[], options: Options = {}): Scene => ({
  conversations,
  options,
});

export const conversation = (name: string, turns: readonly Turn[]): Conversation => ({ name, turns });

export function turn(role: 'user' | 'tool', pattern: Pattern): Turn;
export function turn(
  role: 'assistant',
  parts: readonly ScriptedLanguageModel.ScriptedPart[],
  options?: { delay?: Duration.Input },
): Turn;
export function turn(
  role: Turn['role'],
  value: Pattern | readonly ScriptedLanguageModel.ScriptedPart[],
  options: { delay?: Duration.Input } = {},
): Turn {
  if (role === 'assistant') {
    return { role, parts: Array.isArray(value) ? value : [], ...options };
  }
  return { role, pattern: typeof value === 'string' || value instanceof RegExp ? value : '' };
}

/** A side call answered with the same text every time it comes. */
export const aside = (
  name: string,
  match: (request: ScriptedLanguageModel.ScriptedRequest) => boolean,
  reply: string,
): Aside => ({ name, match, reply });

/** The text of the last user message in the request. */
export const lastUserPrompt = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): string => {
  const message = prompt.content.findLast((message) => message.role === 'user');
  if (message === undefined) {
    return '';
  }
  const { content } = message;
  return typeof content === 'string'
    ? content
    : content.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n');
};

/** Messages as the text the model was shown: quotes and line breaks unescaped. */
const shown = (value: unknown): string => JSON.stringify(value).replace(/\\"/g, '"').replace(/\\n/g, '\n');

/**
 * The first match of `pattern` anywhere in the request: the system prompt, the messages and the tool results. Returns
 * the first capture group if the pattern has one, else the whole match. For what a placeholder cannot express.
 */
export const find = (request: ScriptedLanguageModel.ScriptedRequest, pattern: RegExp): string | undefined => {
  const match = pattern.exec(`${request.system}\n${shown(request.prompt.content)}`);
  return match?.[1] ?? match?.[0];
};

/** What the last tool call returned, as text; empty when the request does not follow a tool call. */
const lastToolResult = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): string => {
  const last = prompt.content.at(-1);
  return last?.role === 'tool' ? shown(last.content) : '';
};

//
// Player.
//

type MatchedTurn = { readonly role: 'user' | 'tool'; readonly match: Matcher; readonly pattern: string };

/** A pattern as its author wrote it, placeholders shown by name, for errors. */
const describe = (pattern: Pattern): string =>
  pattern instanceof RegExp
    ? String(pattern)
    : JSON.stringify(
        pattern.replace(PLACEHOLDER, (_, body: string) => {
          const { kind, name } = parsePlaceholder(body);
          return `\${${kind}('${name}')}`;
        }),
      );
type AssistantTurn = Extract<Turn, { role: 'assistant' }>;

/** Where a conversation stands: its next turn, what it captured, and the prompt its thread is answering. */
type Position = { cursor: number; bindings: Map<string, string>; prompt?: string };

const failure = (description: string): ScriptedLanguageModel.ScriptedTurn => ({
  fail: new AiError.AiError({
    module: 'ScriptedScene',
    method: 'generateText',
    reason: new AiError.UnknownError({ description }),
  }),
});

/** Long enough to show a whole checklist or tool result; a prompt is quoted in full up to this. */
const QUOTE_LIMIT = 4_000;

const quote = (value: string): string =>
  JSON.stringify(value.length > QUOTE_LIMIT ? `${value.slice(0, QUOTE_LIMIT)}…` : value);

/** Where the `user` and `tool` turns at a conversation's cursor leave it: ready to play, or stopped at one that failed. */
type Step =
  | { readonly mismatch: Mismatch }
  | { readonly cursor: number; readonly captured: Record<string, string>; readonly opened: boolean };

type Mismatch = {
  readonly turn: number;
  readonly role: 'user' | 'tool';
  readonly pattern: string;
  readonly value: string;
};

/** Exactly what failed to match: the turn, its pattern as written, and the text it was tested against. */
const mismatchReport = (conversation: string, { turn, role, pattern, value }: Mismatch): string =>
  [
    `Conversation "${conversation}", turn ${turn} (${role}): the ${role === 'user' ? 'prompt' : 'tool result'} did not match.`,
    `  expected: ${pattern}`,
    `  got:      ${quote(value)}`,
  ].join('\n');

/**
 * The script the scripted model plays a scene with. A call goes to an aside; else to the conversation already
 * answering the call's prompt; else to the first conversation whose next turn is a `user` turn matching that prompt.
 * `tool` turns before the next `assistant` turn are matched against the last tool result; they are optional, and a
 * missing one accepts any result.
 */
export const play = ({
  conversations,
  options: { asides = [], promptOf = lastUserPrompt },
}: Scene): ScriptedLanguageModel.ScriptedTurnGenerator => {
  const compiled = conversations.map(({ name, turns }) => ({
    name,
    turns: turns.map((turn): MatchedTurn | AssistantTurn =>
      turn.role === 'assistant'
        ? turn
        : { role: turn.role, match: compile(turn.pattern), pattern: describe(turn.pattern) },
    ),
  }));
  const positions: Position[] = compiled.map(() => ({ cursor: 0, bindings: new Map() }));

  // Runs the `user` and `tool` turns at the cursor against the request: where it stops and what it captured.
  const advance = (index: number, prompt: string, request: ScriptedLanguageModel.ScriptedRequest): Step => {
    const { turns } = compiled[index];
    let cursor = positions[index].cursor;
    const captured: Record<string, string> = {};
    let opened = false;
    for (let next = turns[cursor]; next !== undefined && next.role !== 'assistant'; next = turns[cursor]) {
      const value = next.role === 'user' ? prompt : lastToolResult(request);
      const found = next.match(value);
      if (found === undefined) {
        return { mismatch: { turn: cursor + 1, role: next.role, pattern: next.pattern, value } };
      }
      opened ||= next.role === 'user';
      Object.assign(captured, found);
      cursor++;
    }
    return { cursor, captured, opened };
  };

  return (request) => {
    const aside = asides.find(({ match }) => match(request));
    if (aside) {
      return { parts: [text(aside.reply)] };
    }

    const prompt = promptOf(request);
    // A thread under way keeps its conversation, so those are tried before any that would open on this prompt.
    const order = positions
      .map((position, index) => ({ index, continuing: position.prompt === prompt }))
      .sort((left, right) => Number(right.continuing) - Number(left.continuing));
    for (const { index, continuing } of order) {
      const step = advance(index, prompt, request);
      if ('mismatch' in step) {
        // A thread under way that gets a tool result its script did not expect is a script error, not another thread.
        if (continuing && step.mismatch.role === 'tool') {
          return failure(mismatchReport(compiled[index].name, step.mismatch));
        }
        continue;
      }
      if (!continuing && !step.opened) {
        continue;
      }
      const { name, turns } = compiled[index];
      const next = turns[step.cursor];
      if (next === undefined || next.role !== 'assistant') {
        return failure(`Conversation "${name}" has no assistant turn left for ${quote(prompt)}.`);
      }
      const position = positions[index];
      for (const [key, value] of Object.entries(step.captured)) {
        position.bindings.set(key, value);
      }
      position.cursor = step.cursor + 1;
      position.prompt = prompt;
      try {
        return {
          parts: next.parts.map((part) => fillPart(part, position.bindings)),
          ...(next.delay !== undefined ? { delay: next.delay } : {}),
        };
      } catch (error) {
        return failure(`Conversation "${name}": ${error instanceof Error ? error.message : String(error)}.`);
      }
    }
    // Every conversation's reason for passing on the prompt, so the script can be put right without guessing.
    const reasons = order.flatMap(({ index }) => {
      const step = advance(index, prompt, request);
      return 'mismatch' in step ? [mismatchReport(compiled[index].name, step.mismatch)] : [];
    });
    return failure([`No scripted conversation expects the prompt ${quote(prompt)}.`, ...reasons].join('\n\n'));
  };
};
