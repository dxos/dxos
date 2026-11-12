//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';

import * as ScriptedLanguageModel from './ScriptedLanguageModel.ts';
import * as ScriptedScene from './ScriptedScene.ts';

const { text } = ScriptedLanguageModel;
const { aside, find, play, scene } = ScriptedScene;

const user = (value: string) => ({ role: 'user' as const, content: [{ type: 'text' as const, text: value }] });
const assistant = (value: string) => ({
  role: 'assistant' as const,
  content: [{ type: 'text' as const, text: value }],
});

const model = ScriptedLanguageModel.layer(
  play({
    asides: [aside('name', (request) => request.text.includes('Suggest a name'), 'A name')],
    scenes: [
      scene('poem', /write a poem/i, [{ parts: [text('Roses')] }, { parts: [text('are red')] }]),
      scene('sum', 'What is 2 + 2', [
        { parts: [text((request) => `You said: ${find(request, /What is ([\d +]+)/)}`)] },
      ]),
    ],
  }),
);

describe('ScriptedScene', () => {
  it.effect(
    'plays each scene on the prompt it answers, keeping its own place in its turns',
    Effect.fnUntraced(function* ({ expect }) {
      const poem = (yield* LanguageModel.generateText({ prompt: [user('Write a poem about spring.')] })).text;
      const sum = (yield* LanguageModel.generateText({ prompt: [user('What is 2 + 2?')] })).text;
      // The poem's second turn follows its first, though another scene played in between.
      const more = (yield* LanguageModel.generateText({
        prompt: [user('Write a poem about spring.'), assistant('Roses'), user('Write a poem: go on.')],
      })).text;
      expect([poem, sum, more]).toEqual(['Roses', 'You said: 2 + 2', 'are red']);
    }, Effect.provide(model)),
  );

  it.effect(
    'answers an aside every time it comes, before trying any scene',
    Effect.fnUntraced(function* ({ expect }) {
      const first = (yield* LanguageModel.generateText({ prompt: [user('Suggest a name: write a poem')] })).text;
      const second = (yield* LanguageModel.generateText({ prompt: [user('Suggest a name: write a poem')] })).text;
      expect([first, second]).toEqual(['A name', 'A name']);
    }, Effect.provide(model)),
  );

  it.effect(
    'fails loudly on a prompt no scene answers',
    Effect.fnUntraced(function* ({ expect }) {
      const error = yield* LanguageModel.generateText({ prompt: [user('Something else.')] }).pipe(Effect.flip);
      expect(error.message).toContain('No scripted route matched');
    }, Effect.provide(model)),
  );
});
