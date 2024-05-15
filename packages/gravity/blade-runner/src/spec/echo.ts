//
// Copyright 2024 DXOS.org
//

import { type QueryResult } from '@dxos/echo-db';
import { log } from '@dxos/log';

import { type ReplicantsSummary, type Platform, type SchedulerEnv, type TestParams, type TestPlan } from '../plan';
import { EchoReplicant } from '../replicants/echo-replicant';

type EchoTestSpec = {
  platform: Platform;
  duration: number;
  iterationDelay: number;

  numberOfObjects: number;
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

type EchoTestResult = {
  /**
   * Time to create all objects in [ms].
   */
  creationTime: number;

  /**
   * Time to query all objects in [ms].
   */
  queryTime: number;
};

export class EchoTestPlan implements TestPlan<EchoTestSpec, EchoTestResult> {
  defaultSpec(): EchoTestSpec {
    return {
      duration: 10_000,
      iterationDelay: 0,
      platform: 'nodejs',

      numberOfObjects: 1000,
      numberOfInsertions: 10,
      insertionSize: 128,
      queryResolution: 'index',
    };
  }

  async run(env: SchedulerEnv<EchoTestSpec>, params: TestParams<EchoTestSpec>) {
    const results = {} as EchoTestResult;

    const replicant = await env.spawn(EchoReplicant, { platform: params.spec.platform });
    await replicant.brain.open();

    performance.mark('create:begin');
    await replicant.brain.createDocuments({
      amount: params.spec.numberOfObjects,
      insertions: params.spec.numberOfInsertions,
      mutationsSize: params.spec.insertionSize,
    });
    performance.mark('create:end');
    results.creationTime = performance.measure('create', 'create:begin', 'create:end').duration;

    log.info('objects created', {
      count: params.spec.numberOfObjects,
      size: params.spec.insertionSize * params.spec.numberOfInsertions,
      resolution: params.spec.queryResolution,
      time: results.creationTime,
    });

    performance.mark('query:begin');
    await replicant.brain.queryDocuments({
      expectedAmount: params.spec.numberOfObjects,
      queryResolution: params.spec.queryResolution,
    });
    performance.mark('query:end');
    results.queryTime = performance.measure('query', 'query:begin', 'query:end').duration;

    log.info('done test', results);

    await replicant.brain.close();

    return results;
  }

  async analyze(
    params: TestParams<EchoTestSpec>,
    summary: ReplicantsSummary<EchoTestSpec>,
    result: EchoTestResult,
  ): Promise<any> {}
}
