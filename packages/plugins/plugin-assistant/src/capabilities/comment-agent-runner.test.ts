//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Feed, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { EntityId } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as Harness from '@dxos/plugin-testing/Harness';
import { AnchoredTo, Message, Task, Thread } from '@dxos/types';

import * as AssistantPlugin from '#meta';

const types = [AnchoredTo.AnchoredTo, Feed.Feed, Message.Message, Task.Task, Thread.Thread];

await Harness.preload({ plugins: [ClientPlugin.make({ types }), AssistantPlugin.make(), RoutinePlugin.make()] });

EntityId.dangerouslyDisableRandomness();

describe('CommentAgentRunner', () => {
  test("returns the turn's final reply", { timeout: 120_000 }, async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [
        ClientPlugin.make({ types }),
        AssistantPlugin.make({
          aiServiceMiddleware: ScriptedLanguageModel.scriptedAiServiceMiddleware([
            { parts: [ScriptedLanguageModel.text('Due Friday.')] },
          ]),
        }),
        RoutinePlugin.make(),
      ],
    });
    const { defaultSpace } = await EffectEx.runAndForwardErrors(
      initializeIdentity(harness.get(ClientCapabilities.Client)),
    );

    const subject = defaultSpace.db.add(Task.make({ title: 'Requirements' }));
    const thread = defaultSpace.db.add(Thread.make({ status: 'active' }));
    const message = Obj.make(Message.Message, {
      created: new Date().toISOString(),
      sender: { role: 'user' },
      blocks: [{ _tag: 'text', text: '@Kai when is this due?' }],
    });
    await defaultSpace.db.appendToFeed(await thread.feed.load(), [message]);

    const runner = harness.get(AppCapabilities.CommentAgentRunner);
    const reply = await harness.runPromise(runner.run({ thread, subject, message }));
    expect(reply).toBe('Due Friday.');
  });
});
