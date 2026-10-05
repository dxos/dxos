//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Prompt from 'effect/ai/Prompt';
import * as Context from 'effect/Context';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import type * as Events from './Events.ts';
import * as Fold from './Fold.ts';

/**
 * Names a project from its first prompt, so the sidebar lists what each session is about rather than
 * a column of "Untitled". The model writes the name when it can; a tidied cut of the prompt stands in
 * when it cannot, so a session is never left unnamed because a side call failed.
 */

/** What a project is called before anything names it. */
export const UNTITLED = Fold.empty.title;

/** Long enough to tell sessions apart in a 14rem sidebar, short enough not to wrap. */
const MAX_WORDS = 6;

const MAX_LENGTH = 48;

/** A side call must not outlive the user's patience: past this the prompt's own words are the name. */
const MODEL_TIMEOUT = Duration.seconds(15);

const SYSTEM =
  'You name chat sessions. Reply with a title of 3 to 6 words that says what the user is asking ' +
  'about. Plain words only: no quotes, no trailing punctuation, no "Title:" prefix, no explanation.';

/** Markdown and code that reads as noise in a title: fences, inline code ticks, links, emphasis, headings. */
const tidy = (text: string): string =>
  text
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^#+\s*/gm, '')
    .replace(/[*_~>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The prompt's first sentence, cut at a word boundary to {@link MAX_WORDS} words and
 * {@link MAX_LENGTH} characters, with an ellipsis when anything was cut. What a session is called
 * when no model answered.
 */
export const fallback = (prompt: string): string => {
  const text = tidy(prompt);
  // The first sentence is the question; what follows is usually context the title does not need.
  const sentence = text.match(/^(.+?[.?!])(\s|$)/)?.[1] ?? text;
  const words = sentence
    .replace(/[.?!:;,]+$/, '')
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) {
    return UNTITLED;
  }
  let title = '';
  let cut = sentence.length < text.length;
  for (const [index, word] of words.entries()) {
    const next = title.length === 0 ? word : `${title} ${word}`;
    if (index >= MAX_WORDS || next.length > MAX_LENGTH) {
      cut = true;
      break;
    }
    title = next;
  }
  // A single word longer than the limit (a path, an identifier) is cut mid-word rather than dropped.
  if (title.length === 0) {
    title = words[0].slice(0, MAX_LENGTH - 1);
    cut = true;
  }
  return capitalize(cut ? `${title.replace(/[.?!:;,]+$/, '')}…` : title);
};

/**
 * The model's reply as a title, or `undefined` when it is not one: the first line, unquoted and
 * without a label or trailing punctuation, of one to eight words.
 */
export const clean = (reply: string): string | undefined => {
  const line = tidy(reply.split('\n').find((candidate) => candidate.trim().length > 0) ?? '')
    .replace(/^title\s*:\s*/i, '')
    .replace(/^["'“‘]+|["'”’]+$/g, '')
    .replace(/[.!:;,]+$/, '')
    .trim();
  const words = line.split(' ').filter(Boolean).length;
  return words >= 1 && words <= 8 && line.length <= MAX_LENGTH + 12 ? capitalize(line) : undefined;
};

/**
 * Whether a project should be named from the prompt about to open its first turn: it has had no
 * prompt yet, nothing has set its title, and it was not created with one.
 */
export const unnamed = (title: string, entries: readonly Events.Entry[]): boolean =>
  title === UNTITLED && !entries.some((entry) => entry.event._tag === 'UserMessage' || entry.event._tag === 'TitleSet');

/** Asks the model for a title; falls back to {@link fallback} on any failure, timeout or unusable reply. */
export const generate = (prompt: string): Effect.Effect<string, never, LanguageModel.LanguageModel> =>
  LanguageModel.generateText({
    prompt: Prompt.make([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: [{ type: 'text', text: prompt.slice(0, 2_000) }] },
    ]),
  }).pipe(
    Effect.timeout(MODEL_TIMEOUT),
    Effect.map((response) => clean(response.text) ?? fallback(prompt)),
    Effect.catchCause(() => Effect.succeed(fallback(prompt))),
  );

export interface Api {
  /** A title for a session whose first prompt is `prompt`; never fails. */
  readonly name: (prompt: string) => Effect.Effect<string>;
}

export class Titles extends Context.Service<Titles, Api>()('code-index/Titles') {}

/** Names with whichever model the layer is given; the caller decides it is a cheap one. */
export const layer: Layer.Layer<Titles, never, LanguageModel.LanguageModel> = Layer.effect(
  Titles,
  Effect.gen(function* () {
    const models = yield* Effect.context<LanguageModel.LanguageModel>();
    return { name: (prompt) => generate(prompt).pipe(Effect.provideContext(models)) } satisfies Api;
  }),
);

/** Names every session by {@link fallback} alone, for a stack with no model to spare. */
export const fallbackLayer: Layer.Layer<Titles> = Layer.succeed(Titles, {
  name: (prompt) => Effect.succeed(fallback(prompt)),
});
