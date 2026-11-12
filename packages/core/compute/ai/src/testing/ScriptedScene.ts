//
// Copyright 2026 DXOS.org
//

import {
  type Script,
  type ScriptedRequest,
  type ScriptedRoute,
  type ScriptedTurn,
  text,
} from './ScriptedLanguageModel.ts';

/**
 * One thread's part in a scripted conversation: the prompt the thread answers, and the turns the model takes there, in
 * order. A scene keeps its own place in its turns, so several threads (an agent and the subagents it starts) can run
 * at once against one model.
 */
export type Scene = {
  /** Names the scene in unmatched and exhausted errors. */
  readonly name: string;
  /** The prompt the scene answers: a substring, or a pattern tested against it. */
  readonly prompt: string | RegExp;
  readonly turns: readonly ScriptedTurn[];
};

/** A side call the harness makes outside any scene (naming a chat, a planning reminder), answered the same each time. */
export type Aside = {
  readonly name: string;
  readonly match: (request: ScriptedRequest) => boolean;
  readonly turn: ScriptedTurn;
};

/** Everything a scripted model plays: the scenes, and the side calls answered before any scene is tried. */
export type Play = {
  readonly scenes: readonly Scene[];
  readonly asides?: readonly Aside[];
  /** The prompt a request answers; the text of the last user message unless a harness says otherwise. */
  readonly promptOf?: (request: ScriptedRequest) => string;
};

export const scene = (name: string, prompt: string | RegExp, turns: readonly ScriptedTurn[]): Scene => ({
  name,
  prompt,
  turns,
});

/** A side call answered with the same text every time it comes. */
export const aside = (name: string, match: (request: ScriptedRequest) => boolean, reply: string): Aside => ({
  name,
  match,
  turn: { parts: [text(reply)] },
});

/** The text of the last user message in the request. */
export const lastUserPrompt = ({ prompt }: ScriptedRequest): string => {
  const message = prompt.content.findLast((message) => message.role === 'user');
  if (message === undefined || typeof message.content === 'string') {
    return message?.content ?? '';
  }
  return message.content.flatMap((part) => (part.type === 'text' ? [part.text] : [])).join('\n');
};

/**
 * The first match of `pattern` anywhere in the request: the system prompt, the messages and the tool results. Quotes
 * and line breaks are unescaped first, so a pattern reads as the text the model was shown. Returns the first capture group if the
 * pattern has one, else the whole match.
 */
export const find = (request: ScriptedRequest, pattern: RegExp): string | undefined => {
  const messages = JSON.stringify(request.prompt.content).replace(/\\"/g, '"').replace(/\\n/g, '\n');
  const haystack = `${request.system}\n${messages}`;
  const match = pattern.exec(haystack);
  return match?.[1] ?? match?.[0];
};

/** Turns repeated so an aside answers every call the harness makes; generous, since a session can name many chats. */
const ASIDE_REPEATS = 256;

const matches = (pattern: string | RegExp, value: string): boolean =>
  typeof pattern === 'string' ? value.includes(pattern) : pattern.test(value);

/** The routes the scripted model plays a {@link Play} with: asides first, then each scene on the prompt it answers. */
export const play = ({ scenes, asides = [], promptOf = lastUserPrompt }: Play): Script => [
  ...asides.map(({ name, match, turn }): ScriptedRoute => ({
    name,
    match,
    turns: Array.from({ length: ASIDE_REPEATS }, () => turn),
  })),
  ...scenes.map(({ name, prompt, turns }): ScriptedRoute => ({
    name,
    match: (request) => matches(prompt, promptOf(request)),
    turns,
  })),
];
