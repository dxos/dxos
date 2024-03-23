//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Client, PublicKey } from '@dxos/client';
import { TestBuilder, waitForSpace, performInvitation } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { Filter, TypedObject } from '@dxos/echo-schema';
import { Effector, MutationSignalEmitter, type Signal, SignalTrigger } from '@dxos/functions-signal';
import { afterTest, describe, test } from '@dxos/test';

import { Scheduler } from './scheduler';
import type { FunctionManifest } from '../manifest';

const FUNCTION_ID = 'example.com/function/deepThought';

describe('signal-functions', () => {
  test('echo-mutation -> trigger -> function -> effector', async () => {
    const functionTriggerSignalType = 'invoke-deep-thought';
    const functionResultSignalType = 'deep-though-result-computed';

    const { host: app, guest: agent, hostSpace: appSpace } = await setupMultiPeer();

    const manifest: FunctionManifest = {
      functions: [{ id: FUNCTION_ID, name: 'deepThought', handler: 'deepThought' }],
      triggers: [{ function: FUNCTION_ID, signals: [{ kind: 'suggestion', dataType: functionTriggerSignalType }] }],
    };
    const scheduler = new Scheduler(agent, manifest, {
      callback: async (data) => {
        // normally functions use schema and .signalHandler for validating their inputs
        const question = (data as any).data.value.question;
        return {
          status: 200,
          json: async () => ({
            type: functionResultSignalType,
            value: { question, answer: 42 },
          }),
        };
      },
    });
    await scheduler.start();
    afterTest(() => scheduler.stop());

    const appContext = new Context();
    afterTest(() => appContext.dispose());

    // converts echo mutations to signals
    const appMutationSignalEmitter = new MutationSignalEmitter(app);
    appMutationSignalEmitter.start();
    appContext.onDispose(() => appMutationSignalEmitter.stop());

    // listens to echo mutation signals and transforms them to function invocation signals
    const unsubscribeTrigger = SignalTrigger.fromMutations(appSpace)
      .withFilter(Filter.from((obj) => (obj?.questions ?? []).length > 0))
      .unique((prev, curr) => curr.questions.length > prev.questions.length)
      .debounceMs(10)
      .create((obj) => {
        return createSignal({
          type: functionTriggerSignalType,
          value: { question: obj.questions[obj.questions.length - 1] },
        });
      });
    appContext.onDispose(unsubscribeTrigger);

    // effector subscribes to all signals but invokes callback only for thos matching the provided schema
    const signalSchema = S.struct({
      kind: S.literal('suggestion'),
      data: S.struct({
        type: S.literal(functionResultSignalType),
        value: S.struct({
          question: S.string,
          answer: S.any,
        }),
      }),
    });
    // effector is where function results are processed to produce side effects like db mutations
    const unsubscribeEffector = Effector.forSignalSchema(appSpace, signalSchema, (effectorCtx, signal) => {
      appSpace.db.add(new TypedObject({ answers: [signal.data.value.answer] }));
    });
    appContext.onDispose(unsubscribeEffector);

    const done = new Trigger();
    const query = appSpace.db.query(Filter.from((obj) => (obj.answers?.length ?? 0) > 0));
    const unsubscribeQuery = query.subscribe(({ objects }) => {
      if (objects.length > 0) {
        done.wake(objects[0].answers[0]);
      }
    });
    appContext.onDispose(unsubscribeQuery);

    // echo object change
    //  -> echo mutation signal in MutationSignalEmitter
    //    -> function invocation signal in SignalTrigger
    //      -> function result signal in Scheduler after matching function invocation
    //        -> echo mutation in Effector to which we subscribed in query
    const questionHolder = appSpace.db.add(new TypedObject({ questions: [] }));
    questionHolder.questions.push("What's the answer to the ultimate question of life, the universe, and everything?");

    const theAnswer = await done.wait();
    expect(theAnswer).to.eq(42);
  });

  const createTestBuilder = (): TestBuilder => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    return builder;
  };

  const setupPeer = async (displayName: string = 'host', testBuilder: TestBuilder = createTestBuilder()) => {
    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity({ displayName });
    const space = await client.spaces.create();
    return { space, client };
  };

  const setupMultiPeer = async () => {
    const testBuilder = createTestBuilder();
    const { client: host, space: hostSpace } = await setupPeer('host', testBuilder);
    const { client: guest } = await setupPeer('guest', testBuilder);
    await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));
    const guestSpace = await waitForSpace(guest, hostSpace.key, { ready: true });
    return { host, guest, hostSpace, guestSpace };
  };

  const createSignal = (data: Signal['data']): Signal => ({
    id: PublicKey.random().toHex(),
    kind: 'suggestion',
    metadata: { createdMs: Date.now(), source: 'composer' },
    data,
  });
});
