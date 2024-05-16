//
// Copyright 2024 DXOS.org
//

import { scheduleTaskInterval, sleep } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { checkType } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { type TraceEvent } from '../analysys';
import { ReplicantRegistry, type ReplicantEnv } from '../plan';
import { type TestPeer, TestBuilder } from '../test-builder';
import { randomArraySlice } from '../util';

export type ReplicantRunParams = {
  replicants: number;
  peersPerReplicant: number;

  servers: string[];
  type: 'discovery' | 'signaling';
  topics?: string[];
  discoverTimeout?: number;

  duration: number;
  repeatInterval: number;
  replicantWaitTime: number;
};

export class SignalReplicant {
  builder = new TestBuilder();
  constructor(private readonly env: () => ReplicantEnv) {}

  // TODO(mykola): Refactor to smaller methods.
  async run({
    replicants,
    peersPerReplicant,

    servers,
    type,
    topics,
    discoverTimeout,

    duration,
    repeatInterval,
    replicantWaitTime,
  }: ReplicantRunParams) {
    const ctx = new Context();
    let testCounter = 0;

    const peers = await Promise.all(
      range(peersPerReplicant).map(() =>
        this.builder.createPeer({
          signals: servers.map((server) => ({ server })),
          peerId: PublicKey.random(),
        }),
      ),
    );

    const testRun = async (peer: TestPeer) => {
      log.info(`${testCounter} test iteration running...`);

      const context = ctx.derive({
        onError: (err) => {
          log.trace(
            'dxos.test.signal.context.onError',
            checkType<TraceEvent>({
              type: 'ITERATION_ERROR',
              err: {
                name: err.name,
                message: err.message,
                stack: err.stack,
              },
              peerId: peer.peerId.toHex(),
              iterationId: testCounter,
            }),
          );
        },
      });

      log.trace(
        'dxos.test.signal.iteration.start',
        checkType<TraceEvent>({
          type: 'ITERATION_START',
          peerId: peer.peerId.toHex(),
          iterationId: testCounter,
        }),
      );

      switch (type) {
        case 'discovery': {
          peer.regeneratePeerId();
          for (const topic of topics!) {
            await cancelWithContext(context, peer.joinTopic(PublicKey.from(topic)));
          }

          await sleep(discoverTimeout!);

          await Promise.all(topics!.map((topic) => cancelWithContext(context, peer.leaveTopic(PublicKey.from(topic)))));
          break;
        }
        case 'signaling': {
          await cancelWithContext(
            context,
            peer.sendMessage(PublicKey.from(randomArraySlice(Object.keys(replicants), 1)[0])),
          );
          break;
        }
        default:
          throw new Error(`Unknown test type: ${type}`);
      }

      log.info('iteration finished');
    };

    scheduleTaskInterval(
      ctx,
      async () => {
        await this.env().syncBarrier(`iteration-${testCounter}`, replicants);
        await cancelWithContext(ctx, Promise.all(peers.map((peer) => testRun(peer))));
        testCounter++;
      },
      repeatInterval,
    );

    await sleep(duration);
    await ctx.dispose();
    await sleep(replicantWaitTime);
  }
}

ReplicantRegistry.instance.register(SignalReplicant);
