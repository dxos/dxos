//
// Copyright 2024 DXOS.org
//

import { type AutomergeUrl } from '@dxos/automerge/automerge-repo';
import { log } from '@dxos/log';

import { type SchedulerEnvImpl } from '../env';
import { type ReplicantsSummary, type Platform, type TestParams, type TestPlan, type ReplicantBrain } from '../plan';
import { EchoReplicant } from '../replicants/echo-replicant';

/**
 * +-----------------------+
 * |  Replicant "server"   |
 * |                       |   1 "server" replicant
 * |  Creates space and    |
 * |  shares with others   |
 * +-----------------------+
 *             ^
 *             |
 * +-----------+-----------+
 * |  Replicant "client"   +-+
 * |                       | |
 * |  Replicates space     | +-+   N "client" replicants
 * |  from "server"        | | |
 * +-+---------------------+ | |
 *   +-+---------------------+ |
 *     +-----------------------+
 */
export type ReplicationTestSpec = {
  platform: Platform;

  /**
   * Number of "client" replicants.
   */
  clientReplicants: number;

  /**
   * Number of objects in the space.
   */
  numberOfObjects: number;
  /**
   * Size of each object in bytes.
   */
  objectSizeLimit: number;
  /**
   * Number of insertions per object.
   */
  numberOfInsertions: number;
  insertionSize: number;
};

export type ReplicationTestResult = {
  /**
   * Time to create all objects in [ms].
   */
  creationTime: number;

  /**
   * Time to replicate all objects to each client in [ms].
   */
  replicationTime: number[];
};

/**
 * Test plan for replication.
 */
export class ReplicationTestPlan implements TestPlan<ReplicationTestSpec, ReplicationTestResult> {
  defaultSpec(): ReplicationTestSpec {
    return {
      platform: 'chromium',

      clientReplicants: 10,

      numberOfObjects: 100,
      objectSizeLimit: 2000,
      numberOfInsertions: 1000,
      insertionSize: 10,
    };
  }

  async run(
    env: SchedulerEnvImpl<ReplicationTestSpec>,
    params: TestParams<ReplicationTestSpec>,
  ): Promise<ReplicationTestResult> {
    const results = {} as ReplicationTestResult;

    //
    // Create server replicant.
    //
    const serverReplicant = await env.spawn(EchoReplicant, { platform: params.spec.platform });
    await serverReplicant.brain.open();
    const { peerId: serverId } = await serverReplicant.brain.initializeNetwork();
    const { spaceKey, rootUrl } = await serverReplicant.brain.createDatabase();

    //
    // Create objects.
    //
    {
      performance.mark('create:begin');
      await serverReplicant.brain.createDocuments({
        amount: params.spec.numberOfObjects,
        size: params.spec.objectSizeLimit,
        insertions: params.spec.numberOfInsertions,
        mutationsSize: params.spec.insertionSize,
      });
      performance.mark('create:end');
      results.creationTime = performance.measure('create', 'create:begin', 'create:end').duration;
      log.info('objects created', { time: results.creationTime });
    }

    //
    // Create client replicants.
    //
    /**
     * Network peerId -> replicant mapping.
     */
    const clientReplicants = new Map<string, ReplicantBrain<EchoReplicant>>();
    {
      for (let i = 0; i < params.spec.clientReplicants; i++) {
        const clientReplicant = await env.spawn(EchoReplicant, { platform: params.spec.platform });
        await clientReplicant.brain.open();
        const { peerId } = await clientReplicant.brain.initializeNetwork();
        clientReplicants.set(peerId, clientReplicant);
      }
    }

    //
    // Establish connections between clients and server.
    //
    {
      // Connect clients to server
      await Promise.all(
        Array.from(clientReplicants.entries()).map(async ([peerId, clientReplicant]) => {
          // Unique Redis queues for each client for each test.
          const readClientQueue = `read-${peerId}-${params.testId}`;
          const writeClientQueue = `write-${peerId}-${params.testId}`;
          await clientReplicant.brain.connect({
            otherPeerId: serverId,
            readQueue: readClientQueue,
            writeQueue: writeClientQueue,
          });
          await serverReplicant.brain.connect({
            otherPeerId: peerId,
            readQueue: writeClientQueue, // Read from client's write queue.
            writeQueue: readClientQueue, // Write to client's read queue.
          });
        }),
      );
    }

    //
    // Query objects on clients.
    // Replications is successful if all clients can query all objects.
    //
    {
      const replicationTimes: number[] = [];
      await Promise.all(
        Array.from(clientReplicants.values()).map(async (clientReplicant) => {
          performance.mark('query:begin');
          await clientReplicant.brain.openDatabase({ spaceKey, rootUrl: rootUrl as AutomergeUrl });
          await clientReplicant.brain.queryDocuments({
            expectedAmount: params.spec.numberOfObjects,
          });
          performance.mark('query:end');
          replicationTimes.push(performance.measure('query', 'query:begin', 'query:end').duration);
        }),
      );
      results.replicationTime = replicationTimes;
    }

    return results;
  }

  async analyze(
    params: TestParams<ReplicationTestSpec>,
    summary: ReplicantsSummary,
    result: ReplicationTestResult,
  ): Promise<any> {}
}
