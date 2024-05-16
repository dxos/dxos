//
// Copyright 2024 DXOS.org
//

import { type Callback, Redis, type RedisOptions } from 'ioredis';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { ReplicantRpcHandle } from './replicant-rpc-handle';
import { REDIS_PORT, createRedisRpcPort } from './util';
import { WebSocketRedisProxy } from './websocket-redis-proxy';
import { type Replicant, type ReplicantBrain, type SchedulerEnv, type RpcHandle } from '../interface';
import { runNode } from '../run-process';
import { type GlobalOptions, type TestParams } from '../spec';

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

  private replicantIdx: number = 0;

  // Start websocket REDIS proxy for browser tests.
  private readonly _server = new WebSocketRedisProxy();

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

  async syncBarrier(key: string) {
    const agentCount = Object.keys(this.params.agents).length;
    const syncKey = `${this.params.testId}:${key}`;

    await this._barrier(syncKey, agentCount);
  }

  /**
   * Waits for all agents to reach this statement.
   * Each agent can optionally submit data to be returned to all agents.
   */
  async syncData<T>(key: string, data?: T): Promise<T[]> {
    const agentCount = Object.keys(this.params.agents).length;
    const syncKey = `${this.params.testId}:${key}`;

    if (data !== undefined) {
      await this.redis.set(`${syncKey}:data:${this.params.agentIdx}`, JSON.stringify(data));
    }
    await this._barrier(syncKey, agentCount);

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

  // TODO(mykola): Add options to spawn browser.
  async spawn<T>(brain: ReplicantBrain<T>): Promise<Replicant<T>> {
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
    }) as RpcHandle<T>;

    const { kill } = runNode({
      replicantIdx: this.replicantIdx++,
      outDir: this.params.outDir,
      profile: this._options.profile,
      debug: this._options.debug,
      replicantParams: {
        name: brain.name,
        portSendQueue: responseQueue,
        portReceiveQueue: requestQueue,
      },
    });

    return {
      brain: rpcHandle,
      kill,
    };
  }
}
