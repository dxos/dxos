//
// Copyright 2024 DXOS.org
//

import { type Callback, Redis, type RedisOptions } from 'ioredis';
import path from 'node:path';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { ReplicantRpcHandle } from './replicant-rpc-handle';
import { REDIS_PORT, createRedisRpcPort } from './util';
import { WebSocketRedisProxy } from './websocket-redis-proxy';
import { type Replicant, type ReplicantBrain, type SchedulerEnv, type RpcHandle } from '../interface';
import { runNode } from '../run-process';
import { type AgentRuntimeParams, type AgentParams, type GlobalOptions, type TestParams } from '../spec';

export class SchedulerEnvImpl<S> implements SchedulerEnv {
  public redis: Redis;

  // Redis client for subscribing to sync events.
  public redisSub: Redis;

  /**
   * Redis client for submitting RPC requests.
   */
  public rpcRequests: Redis;

  /**
   * Redis client for pulling RPC responses.
   * This client uses blocking pop operation to wait for responses
   * so we need different clients for RPC requests and responses.
   */
  public rpcResponses: Redis;
  // Start websocket REDIS proxy for browser tests.
  private readonly _server = new WebSocketRedisProxy();

  private replicantIdx: number = 0;

  constructor(
    private readonly _options: GlobalOptions,
    public params: TestParams<S>,
    private readonly _redisOptions?: RedisOptions,
  ) {
    this.redis = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    this.redisSub = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    this.rpcRequests = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    this.rpcResponses = new Redis(this._redisOptions ?? { port: REDIS_PORT });

    this.redis.on('error', (err) => log.info('Redis Client Error', err));
    this.redisSub.on('error', (err) => log.info('Redis Client Error', err));
    this.rpcRequests.on('error', (err) => log.info('Redis Client Error', err));
    this.rpcResponses.on('error', (err) => log.info('Redis Client Error', err));
  }

  async open() {
    await this.redis.config('SET', 'notify-keyspace-events', 'AKE');
    await this.redisSub.config('SET', 'notify-keyspace-events', 'AKE');
  }

  async close() {
    this.redis.disconnect();
    this.redisSub.disconnect();
    this.rpcRequests.disconnect();
    this.rpcResponses.disconnect();
    await this._server.destroy();
  }

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
    runtime: AgentRuntimeParams = { platform: 'nodejs' },
  ): Promise<Replicant<T>> {
    const requestQueue = `replicant:requests:${this.params.testId}`;
    const responseQueue = `replicant:responses:${this.params.testId}`;
    const rpcPort = createRedisRpcPort({
      sendClient: this.rpcRequests,
      receiveClient: this.rpcResponses,
      sendQueue: requestQueue,
      receiveQueue: responseQueue,
    });

    const rpcHandle = new ReplicantRpcHandle({
      brain,
      rpcPort,
    });

    await rpcHandle.open();
    const replicantIdx = this.replicantIdx++;

    const agentParams: AgentParams<S> = {
      agentIdx: replicantIdx,
      agentId: `test-${this.params.testId}:replicant-${replicantIdx}`,
      outDir: path.join(this.params.outDir, String(replicantIdx)),
      name: brain.name,
      planRunDir: this.params.outDir,
      redisPortSendQueue: responseQueue,
      redisPortReceiveQueue: requestQueue,

      runtime,
      testId: this.params.testId,
      spec: this.params.spec,
    };

    const { kill } = runNode({
      agentParams,
      options: this._options,
    });

    return {
      brain: rpcHandle as RpcHandle<T>,
      kill: async () => {
        await rpcHandle.close();
        kill();
      },
    };
  }
}
