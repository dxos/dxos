//
// Copyright 2024 DXOS.org
//

import { type Callback, Redis, type RedisOptions } from 'ioredis';
import path from 'node:path';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { ReplicantRpcHandle, open, close } from './replicant-rpc-handle';
import { REDIS_PORT, createRedisRpcPort } from './util';
import { WebSocketRedisProxy } from './websocket-redis-proxy';
import { type Replicant, type ReplicantBrain, type SchedulerEnv, type RpcHandle } from '../interface';
import { type ProcessHandle, runBrowser, runNode } from '../run-process';
import {
  type ReplicantRuntimeParams,
  type ReplicantParams,
  type GlobalOptions,
  type TestParams,
  AGENT_LOG_FILE,
  type ReplicantsSummary,
} from '../spec';

export class SchedulerEnvImpl<S> implements SchedulerEnv {
  /**
   *  Redis client for data exchange.
   */
  public redis: Redis;

  /**
   *  Redis client for subscribing to sync events.
   */
  public redisSub: Redis;

  /**
   * Start websocket REDIS proxy for browser tests.
   */
  private readonly _server = new WebSocketRedisProxy();

  /**
   * Used to generate Replicant ids
   */
  private _currentReplicant: number = 0;

  public replicants: Replicant<any>[] = [];

  constructor(
    private readonly _options: GlobalOptions,
    public params: TestParams<S>,
    private readonly _redisOptions?: RedisOptions,
  ) {
    this.redis = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    this.redisSub = new Redis(this._redisOptions ?? { port: REDIS_PORT });

    this.redis.on('error', (err) => log.info('Redis Client Error', err));
    this.redisSub.on('error', (err) => log.info('Redis Client Error', err));
  }

  getReplicantsSummary(): ReplicantsSummary {
    const summary: ReplicantsSummary = {};

    for (const replicant of this.replicants) {
      summary[replicant.params.replicantId] = replicant.params;
    }

    return summary;
  }

  async open() {
    await this.redis.config('SET', 'notify-keyspace-events', 'AKE');
    await this.redisSub.config('SET', 'notify-keyspace-events', 'AKE');
  }

  async close() {
    for (const replicant of this.replicants) {
      // Kill all replicants.
      replicant.kill('SIGTERM');
    }

    this.redis.disconnect();
    this.redisSub.disconnect();
    await this._server.destroy();
  }

  /**
   * Waits for all agents to reach this statement.
   */
  async syncBarrier(key: string, amount: number) {
    const syncKey = `${this.params.testId}:${key}`;

    await this._barrier(syncKey, amount);
  }

  /**
   * Waits for all agents to reach this statement.
   * Each agent can optionally submit data to be returned to all agents.
   */
  async syncData<T>(key: string, amount: number, data?: T): Promise<T[]> {
    const syncKey = `${this.params.testId}:${key}`;

    if (data !== undefined) {
      await this.redis.set(`${syncKey}:data:scheduler`, JSON.stringify(data));
    }
    await this._barrier(syncKey, amount);

    const values = await this.redis.keys(`${syncKey}:data:*`);
    const dataValues = await this.redis.mget(values);
    const result = dataValues.map((value) => JSON.parse(value!));
    return result;
  }

  /**
   * Waits for all agents to reach this statement.
   */
  private async _barrier(syncKey: string, count: number) {
    const done = new Trigger();
    const listener: Callback<unknown> = async (error, result) => {
      const value = await this.redis.get(syncKey);

      if (parseInt(value!) === count) {
        done.wake();
      }
    };
    this.redisSub.on('message', listener);
    await this.redisSub.subscribe(`__keyspace@0__:${syncKey}`);

    await this.redis.incr(syncKey);
    await done.wait();

    this.redisSub.off('message', listener);
    await this.redisSub.unsubscribe(`__keyspace@0__:${syncKey}`);
  }

  async spawn<T>(
    brain: ReplicantBrain<T>,
    runtime: ReplicantRuntimeParams = { platform: 'nodejs' },
  ): Promise<Replicant<T>> {
    const replicantId = String(this._currentReplicant++);
    const outDir = path.join(this.params.outDir, String(replicantId));

    const requestQueue = `replicant-${replicantId}:requests:${this.params.testId}`;
    const responseQueue = `replicant-${replicantId}:responses:${this.params.testId}`;

    /**
     * Redis client for submitting RPC requests.
     */
    const rpcRequests = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    rpcRequests.on('error', (err) => log.info('Redis Client Error', err));
    /**
     * Redis client for pulling RPC responses.
     * This client uses blocking pop operation to wait for responses
     * so we need different clients for RPC requests and responses.
     */
    const rpcResponses = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    rpcResponses.on('error', (err) => log.info('Redis Client Error', err));

    const rpcPort = createRedisRpcPort({
      sendClient: rpcRequests,
      receiveClient: rpcResponses,
      sendQueue: requestQueue,
      receiveQueue: responseQueue,
    });

    const rpcHandle = new ReplicantRpcHandle({
      brain,
      rpcPort,
    });

    await rpcHandle[open]();

    const replicantParams: ReplicantParams = {
      replicantId,
      outDir,
      logFile: path.join(outDir, AGENT_LOG_FILE),
      replicantClass: brain.name,
      planRunDir: this.params.outDir,
      redisPortSendQueue: responseQueue,
      redisPortReceiveQueue: requestQueue,

      runtime,
      testId: this.params.testId,
    };

    let processHandle: ProcessHandle;
    if (runtime.platform === 'nodejs') {
      processHandle = runNode({
        replicantParams,
        options: this._options,
      });
    } else {
      processHandle = await runBrowser({
        replicantParams,
        options: this._options,
      });
    }

    const replicantHandle = {
      brain: rpcHandle as RpcHandle<T>,
      kill: (signal?: NodeJS.Signals | number) => {
        rpcRequests.disconnect();
        rpcResponses.disconnect();
        processHandle.kill(signal);
        void rpcHandle[close]().catch((err) => log.catch(err));
      },
      params: replicantParams,
    };

    this.replicants.push(replicantHandle);

    return replicantHandle;
  }
}
