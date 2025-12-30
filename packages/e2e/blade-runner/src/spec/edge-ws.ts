//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../env';
import { type Platform, type ReplicantsSummary, type TestPlan, type TestProps } from '../plan';
import { WsReplicant } from '../replicants/ws-replicant';

export type EdgeWsTestSpec = {
  platform: Platform;
  messageAmount: number;
  messagesPerBatch?: number;
  delayBetweenBatches?: number;
  waitForResponses?: boolean;
  endpoint: string;
};

type EdgeWsResult = { testDuration: number };

export class EdgeWs implements TestPlan<EdgeWsTestSpec, EdgeWsResult> {
  defaultSpec(): EdgeWsTestSpec {
    return {
      platform: 'nodejs',
      messageAmount: 1,
      endpoint: 'wss://edge.dxos.workers.dev',
      waitForResponses: false,
    };
  }

  async run(env: SchedulerEnvImpl<EdgeWsTestSpec>, params: TestProps<EdgeWsTestSpec>): Promise<EdgeWsResult> {
    const replicant = await env.spawn(WsReplicant, { platform: params.spec.platform });
    const topic = PublicKey.random().toHex();
    const result: EdgeWsResult = { testDuration: 0 };

    try {
      await replicant.brain.initEdgeConnection({ endpoint: params.spec.endpoint });
      await replicant.brain.joinSwarm({ topic });

      performance.mark('testDuration:start');
      await replicant.brain.testDuration({
        topic,
        messageAmount: params.spec.messageAmount,
        waitForResponses: params.spec.waitForResponses,
      });
      performance.mark('testDuration:end');
      result.testDuration = performance.measure('testDuration', 'testDuration:start', 'testDuration:end').duration;
      log.info('testDuration', { testDuration: result.testDuration });

      await replicant.brain.leaveSwarm({ topic });
    } catch (error) {
      log.error('error', { error });
    } finally {
      replicant.kill(0);
    }

    return result;
  }

  async analyze(params: TestProps<EdgeWsTestSpec>, summary: ReplicantsSummary, result: EdgeWsResult) {}
}
