//
// Copyright 2024 DXOS.org
//

import { type AutomergeUrl } from '@automerge/automerge-repo';

import { type QueryResult } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type SchedulerEnv } from '../env';
import { type Platform, type ReplicantsSummary, type TestPlan, type TestProps } from '../plan';
import { EchoReplicant } from '../replicants/echo-replicant';

type QueryTestSpec = {
  platform: Platform;

  numberOfObjects: number;

  /**
   * Size limit of each object in bytes.
   */
  objectSizeLimit: number;
  /**
   * Number of insertions per object.
   */
  numberOfInsertions: number;
  insertionSize: number;

  /**
   * Query resolution.
   */
  queryResolution: Exclude<QueryResult<any>['resolution'], undefined>['source'];
};

type QueryTestResult = {
  /**
   * Time to create all objects in [ms].
   */
  creationTime: number;

  /**
   * Time to query all objects from cache in [ms].
   */
  cachedQueryTime: number;

  /**
   * Time to query all objects from disk in [ms].
   */
  diskQueryTime: number;
};

export class QueryTestPlan implements TestPlan<QueryTestSpec, QueryTestResult> {
  defaultSpec(): QueryTestSpec {
    return {
      platform: 'chromium',

      numberOfObjects: 100,
      objectSizeLimit: 2000,
      numberOfInsertions: 1000,
      insertionSize: 10,

      queryResolution: 'index',
    };
  }

  async run(env: SchedulerEnv, params: TestProps<QueryTestSpec>): Promise<QueryTestResult> {
    const results = {} as QueryTestResult;
    // TODO(mykola): Maybe factor out?
    const userDataDir = `/tmp/echo-replicant-${PublicKey.random().toHex()}`;

    const replicant = await env.spawn(EchoReplicant, { platform: params.spec.platform, userDataDir });
    await replicant.brain.open();
    const { spaceKey, rootUrl } = await replicant.brain.createDatabase();

    //
    // Create objects.
    //
    {
      performance.mark('create:begin');
      await replicant.brain.createDocuments({
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
    // Query objects from automerge cache.
    //
    {
      performance.mark('cachedQuery:begin');
      await replicant.brain.queryDocuments({
        expectedAmount: params.spec.numberOfObjects,
        queryResolution: params.spec.queryResolution,
      });
      performance.mark('cachedQuery:end');
      results.cachedQueryTime = performance.measure('cachedQuery', 'cachedQuery:begin', 'cachedQuery:end').duration;
      log.info('objects queried from cache', { time: results.cachedQueryTime });
    }
    await replicant.brain.close();
    replicant.kill(0);

    //
    // Query objects from disk.
    //
    {
      const replicant = await env.spawn(EchoReplicant, { platform: params.spec.platform, userDataDir });
      await replicant.brain.open();
      await replicant.brain.openDatabase({ spaceKey, rootUrl: rootUrl as AutomergeUrl });

      performance.mark('diskQuery:begin');
      await replicant.brain.queryDocuments({
        expectedAmount: params.spec.numberOfObjects,
      });
      performance.mark('diskQuery:end');
      results.diskQueryTime = performance.measure('diskQuery', 'diskQuery:begin', 'diskQuery:end').duration;
      log.info('objects queried from disk', { time: results.diskQueryTime });
      await replicant.brain.close();
    }

    log.info('done test', results);
    return results;
  }

  async analyze(params: TestProps<QueryTestSpec>, summary: ReplicantsSummary, result: QueryTestResult): Promise<any> {}
}
