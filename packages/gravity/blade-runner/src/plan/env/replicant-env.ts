//
// Copyright 2023 DXOS.org
//

import { type Callback, Redis, type RedisOptions } from 'ioredis';

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';

import { ReplicantRpcServer } from './replicant-rpc-server';
import { REDIS_PORT, createRedisRpcPort } from './util';
import { type ReplicantEnv } from '../interface';
import { type AgentParams } from '../spec';

export { type RedisOptions };

export class ReplicantEnvImpl<S, C> implements ReplicantEnv {
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

  public replicantRpcServer: ReplicantRpcServer;

  constructor(
    public replicant: any,
    public params: AgentParams<S, C>,
    private readonly _redisOptions?: RedisOptions,
  ) {
    this.redis = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    this.redisSub = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    this.rpcRequests = new Redis(this._redisOptions ?? { port: REDIS_PORT });
    this.rpcResponses = new Redis(this._redisOptions ?? { port: REDIS_PORT });

    this.replicantRpcServer = new ReplicantRpcServer({
      handler: this.replicant,
      port: createRedisRpcPort({
        sendClient: this.rpcRequests,
        receiveClient: this.rpcResponses,
        sendQueue: this.params.redisPortSendQueue,
        receiveQueue: this.params.redisPortReceiveQueue,
      }),
    });

    this.redis.on('error', (err) => log.info('Redis Client Error', err));
    this.redisSub.on('error', (err) => log.info('Redis Client Error', err));
  }

  async open() {
    await this.redis.config('SET', 'notify-keyspace-events', 'AKE');
    await this.redisSub.config('SET', 'notify-keyspace-events', 'AKE');

    await this.replicantRpcServer.open();
  }

  async close() {
    await this.replicantRpcServer.close();

    this.redis.disconnect();
    this.redisSub.disconnect();
    this.rpcRequests.disconnect();
    this.rpcResponses.disconnect();
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
      await this.redis.set(`${syncKey}:data:${this.params.agentIdx}`, JSON.stringify(data));
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
}
