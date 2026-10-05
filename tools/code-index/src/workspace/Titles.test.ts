//
// Copyright 2026 DXOS.org
//

import * as AiError from 'effect/ai/AiError';
import * as LanguageModel from 'effect/ai/LanguageModel';
import type * as Response from 'effect/ai/Response';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Events from './Events.ts';
import * as Titles from './Titles.ts';

/** A model whose every non-streamed reply is `reply`, or which fails. */
const replying = (reply: string | AiError.AiError): Layer.Layer<LanguageModel.LanguageModel> =>
  Layer.effect(
    LanguageModel.LanguageModel,
    LanguageModel.make({
      generateText: () =>
        reply instanceof AiError.AiError
          ? Effect.fail(reply)
          : Effect.succeed<Response.PartEncoded[]>([{ type: 'text', text: reply }]),
      streamText: () => Stream.empty,
    }),
  );

const unavailable = new AiError.AiError({
  module: 'test',
  method: 'generateText',
  reason: new AiError.InvalidOutputError({ description: 'connection refused' }),
});

const name = (prompt: string, model: Layer.Layer<LanguageModel.LanguageModel>): Promise<string> =>
  EffectEx.runPromise(Titles.generate(prompt).pipe(Effect.provide(model)));

describe('Titles', () => {
  test('a short prompt is its own title, capitalised and without its question mark', ({ expect }) => {
    expect(Titles.fallback('which packages depend on echo?')).toBe('Which packages depend on echo');
  });

  test('a long prompt is cut at a word boundary with an ellipsis', ({ expect }) => {
    const title = Titles.fallback(
      'Show me every operation that writes to a space and draw how they reach the database layer',
    );
    expect(title).toBe('Show me every operation that writes…');
    expect(title.length).toBeLessThanOrEqual(49);
  });

  test('only the first sentence counts, and markdown, code and links are dropped', ({ expect }) => {
    expect(
      Titles.fallback('## Explain `Fold.apply` in [Fold](https://example.com/fold). Then **draw** it.\n```ts\nx\n```'),
    ).toBe('Explain Fold.apply in Fold…');
  });

  test('a prompt with no words keeps the default title, and one huge word is cut', ({ expect }) => {
    expect(Titles.fallback('   \n ``` ```  ')).toBe(Titles.UNTITLED);
    const word = 'a'.repeat(80);
    expect(Titles.fallback(word)).toBe(`A${'a'.repeat(46)}…`);
  });

  test('a model reply is unquoted, unlabelled and stripped of trailing punctuation', ({ expect }) => {
    expect(Titles.clean('Title: "Echo package dependents."')).toBe('Echo package dependents');
    expect(Titles.clean('\n  space write operations\nBecause you asked about…')).toBe('Space write operations');
  });

  test('a reply that is not a title is refused', ({ expect }) => {
    expect(Titles.clean('')).toBeUndefined();
    expect(Titles.clean('This session is about many things that are hard to summarise in one go')).toBeUndefined();
  });

  test('the model names the session when it answers', async ({ expect }) => {
    expect(await name('which packages depend on echo?', replying('Echo package dependents'))).toBe(
      'Echo package dependents',
    );
  });

  test('a failing model or an unusable reply falls back to the prompt', async ({ expect }) => {
    expect(await name('which packages depend on echo?', replying(unavailable))).toBe('Which packages depend on echo');
    expect(await name('which packages depend on echo?', replying('   '))).toBe('Which packages depend on echo');
  });

  test('only a project with no prompt and no title set is unnamed', ({ expect }) => {
    const entry = (event: Events.Event, seq = 1): Events.Entry => ({ projectId: 'project', seq, event });
    expect(Titles.unnamed(Titles.UNTITLED, [])).toBe(true);
    expect(Titles.unnamed(Titles.UNTITLED, [entry(new Events.CanvasCleared({}))])).toBe(true);
    expect(Titles.unnamed('Mine', [])).toBe(false);
    expect(Titles.unnamed(Titles.UNTITLED, [entry(new Events.UserMessage({ text: 'hi' }))])).toBe(false);
    // A rename back to the default name is still the user's choice.
    expect(Titles.unnamed(Titles.UNTITLED, [entry(new Events.TitleSet({ title: Titles.UNTITLED }))])).toBe(false);
  });
});
