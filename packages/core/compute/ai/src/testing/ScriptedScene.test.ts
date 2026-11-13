//
// Copyright 2026 DXOS.org
//

import { describe, it, test } from '@effect/vitest';
import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Prompt from 'effect/ai/Prompt';
import * as Effect from 'effect/Effect';

import * as ScriptedLanguageModel from './ScriptedLanguageModel.ts';
import * as ScriptedScene from './ScriptedScene.ts';

const user = (value: string) => ({ role: 'user' as const, content: [{ type: 'text' as const, text: value }] });
const assistant = (value: string) => ({
  role: 'assistant' as const,
  content: [{ type: 'text' as const, text: value }],
});
const toolCall = (id: string, name: string) => ({
  role: 'assistant' as const,
  content: [{ type: 'tool-call' as const, id, name, params: {} }],
});
const toolResult = (id: string, name: string, result: unknown) => ({
  role: 'tool' as const,
  content: [{ type: 'tool-result' as const, id, name, isFailure: false, result }],
});

const OBJECT = 'echo://@/01J0000000000000000000000A';

const script = () =>
  ScriptedLanguageModel.layer(
    ScriptedScene.play(
      ScriptedScene.make(
        [
          ScriptedScene.conversation('haiku', [
            ScriptedScene.turn('user', 'Write me a haiku'),
            ScriptedScene.turn('assistant', [ScriptedScene.text('Calm.')]),
            ScriptedScene.turn('user', /another one/i),
            ScriptedScene.turn('assistant', [ScriptedScene.text('Calm again.')]),
          ]),
        ],
        { asides: [ScriptedScene.aside('name', (request) => request.tools.length > 0, 'A name')] },
      ),
    ),
  );

describe('ScriptedScene', () => {
  it.effect(
    'plays a conversation turn by turn, a follow-up prompt unlocking the turns after it',
    Effect.fnUntraced(function* ({ expect }) {
      const first = yield* LanguageModel.generateText({ prompt: [user('Write me a haiku')] });
      const second = yield* LanguageModel.generateText({
        prompt: [user('Write me a haiku'), assistant('Calm.'), user('Another one, please.')],
      });
      expect([first.text, second.text]).toEqual(['Calm.', 'Calm again.']);
    }, Effect.provide(script())),
  );

  test('captures placeholders from the prompt and from tool results, and writes them into later turns', ({
    expect,
  }) => {
    const play = ScriptedScene.play(
      ScriptedScene.make([
        ScriptedScene.conversation('print', [
          ScriptedScene.turn('user', `Print me object ${ScriptedScene.objectId('object a')}`),
          ScriptedScene.turn('assistant', [
            ScriptedScene.toolCall('object-get', { id: ScriptedScene.objectId('object a') }),
          ]),
          ScriptedScene.turn('tool', `"title":"${ScriptedScene.capture('title', /[^"]+/)}"`),
          ScriptedScene.turn('assistant', [
            ScriptedScene.text(`${ScriptedScene.capture('title')} is ${ScriptedScene.objectId('object a')}.`),
          ]),
        ]),
      ]),
    );
    const request = (...content: Prompt.MessageEncoded[]): ScriptedLanguageModel.ScriptedRequest => ({
      system: '',
      text: '',
      prompt: Prompt.make(content),
      tools: [],
    });

    const call = play(request(user(`Print me object ${OBJECT}`)), 0);
    expect(call).toMatchObject({ parts: [{ _tag: 'toolCall', name: 'object-get', input: { id: OBJECT } }] });

    const reply = play(
      request(
        user(`Print me object ${OBJECT}`),
        toolCall('call-1', 'object-get'),
        toolResult('call-1', 'object-get', { title: 'Launch plan' }),
      ),
      1,
    );
    expect(reply).toMatchObject({ parts: [{ _tag: 'text', text: `Launch plan is ${OBJECT}.` }] });
  });

  it.effect(
    'fails loudly on a prompt no conversation expects',
    Effect.fnUntraced(function* ({ expect }) {
      const error = yield* LanguageModel.generateText({ prompt: [user('Something else.')] }).pipe(Effect.flip);
      // Says what each conversation was waiting for, pattern as written, beside the text it got.
      expect(error.message).toContain('No scripted conversation expects the prompt "Something else."');
      expect(error.message).toContain('Conversation "haiku", turn 1 (user): the prompt did not match.');
      expect(error.message).toContain('expected: "Write me a haiku"');
    }, Effect.provide(script())),
  );

  test('reads every result of a turn that made several calls, and hands a generated thread to its generator', ({
    expect,
  }) => {
    const play = ScriptedScene.play(
      ScriptedScene.make([
        ScriptedScene.conversation('fan out', [
          ScriptedScene.turn('user', 'Start both'),
          ScriptedScene.turn('assistant', [
            ScriptedScene.toolCall('start', { name: 'a' }),
            ScriptedScene.toolCall('start', { name: 'b' }),
          ]),
          ScriptedScene.turn('tool', `started ${ScriptedScene.threadId('a')} for a`),
          ScriptedScene.turn('tool', `started ${ScriptedScene.threadId('b')} for b`),
          ScriptedScene.turn('assistant', [
            ScriptedScene.text(`${ScriptedScene.threadId('a')} and ${ScriptedScene.threadId('b')}`),
          ]),
        ]),
        ScriptedScene.generated('echo', /^echo /, (request, index) => ({
          parts: [ScriptedLanguageModel.text(`call ${index}: ${ScriptedScene.lastUserPrompt(request).slice(5)}`)],
        })),
      ]),
    );
    const request = (...content: Prompt.MessageEncoded[]): ScriptedLanguageModel.ScriptedRequest => ({
      system: '',
      text: '',
      prompt: Prompt.make(content),
      tools: [],
    });

    play(request(user('Start both')), 0);
    const reply = play(
      request(
        user('Start both'),
        toolCall('call-a', 'start'),
        toolResult('call-a', 'start', 'started thread-a for a'),
        toolResult('call-b', 'start', 'started thread-b for b'),
      ),
      1,
    );
    expect(reply).toMatchObject({ parts: [{ _tag: 'text', text: 'thread-a and thread-b' }] });
    expect(play(request(user('echo hello')), 2)).toMatchObject({ parts: [{ _tag: 'text', text: 'call 2: hello' }] });
  });

  test('captures from the system prompt with a system turn', ({ expect }) => {
    const play = ScriptedScene.play(
      ScriptedScene.make([
        ScriptedScene.conversation('checklist', [
          ScriptedScene.turn('user', 'Build.'),
          ScriptedScene.turn('system', `1. [ ] Write it\n   (ref: [AB12](${ScriptedScene.objectId('task')}))`),
          ScriptedScene.turn('assistant', [ScriptedScene.text(`Starting ${ScriptedScene.objectId('task')}.`)]),
        ]),
      ]),
    );
    const reply = play(
      {
        system: `Your checklist:\n1. [ ] Write it\n   (ref: [AB12](${OBJECT}))`,
        text: '',
        prompt: Prompt.make([user('Build.')]),
        tools: [],
      },
      0,
    );
    expect(reply).toMatchObject({ parts: [{ _tag: 'text', text: `Starting ${OBJECT}.` }] });
  });
});
