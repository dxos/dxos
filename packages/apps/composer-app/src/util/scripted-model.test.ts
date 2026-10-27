//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Prompt from 'effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import * as ProjectMailboxOperation from '@dxos/plugin-projects/ProjectMailboxOperation';

import { countTurnsSincePrompt, makeScriptedModel } from './scripted-model.ts';

const TOOL = 'space-query-objects';

const user = (text: string) => ({ role: 'user' as const, content: [{ type: 'text' as const, text }] });
const call = (id: string, name = TOOL) => ({
  role: 'assistant' as const,
  content: [{ type: 'tool-call' as const, id, name, params: {}, providerExecuted: false }],
});
const result = (id: string, name = TOOL) => ({
  role: 'tool' as const,
  content: [{ type: 'tool-result' as const, id, name, isFailure: false, result: {} }],
});
const answer = (text: string) => ({ role: 'assistant' as const, content: [{ type: 'text' as const, text }] });

describe('countTurnsSincePrompt', () => {
  test('counts the tool calls since the latest prompt only', ({ expect }) => {
    const prompt = Prompt.make([
      user('first'),
      call('a'),
      result('a'),
      answer('done'),
      user('second'),
      call('b'),
      result('b'),
      call('c'),
      result('c'),
    ]);
    expect(countTurnsSincePrompt(prompt, TOOL)).toBe(2);
  });

  test('ignores calls to other tools', ({ expect }) => {
    const prompt = Prompt.make([
      user('go'),
      call('a', 'other-tool'),
      result('a', 'other-tool'),
      call('b'),
      result('b'),
    ]);
    expect(countTurnsSincePrompt(prompt, TOOL)).toBe(1);
  });

  test('does not restart on a user message injected after a tool result', ({ expect }) => {
    const prompt = Prompt.make([user('go'), call('a'), result('a'), user('reminder'), call('b'), result('b')]);
    expect(countTurnsSincePrompt(prompt, TOOL)).toBe(2);
  });
});

describe('scripted triage', () => {
  test('answers a TriageMessages prompt from the Community support script', { timeout: 30_000 }, async ({ expect }) => {
    const prompt = [
      'You triage messages posted in a community chat channel for the team behind "Community".',
      'Author: Ivo',
      'Message:',
      'Is there a guide to customizing storage? I would like to keep my spaces on an external drive.',
    ].join('\n');
    const value = await EffectEx.runPromise(
      LanguageModel.generateObject({ schema: ProjectMailboxOperation.TriageResult, prompt }).pipe(
        Effect.map(({ value }) => value),
        Effect.provide(Layer.unwrap(makeScriptedModel())),
      ),
    );
    expect(value.reply).toContain("There isn't a guide");
    expect(value.tasks).toEqual([{ kind: 'docs', title: 'Write a guide to customizing storage' }]);
  });
});
