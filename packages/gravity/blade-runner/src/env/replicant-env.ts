//
// Copyright 2023 DXOS.org
//

import { type Callback, Redis, type RedisOptions } from 'ioredis';

import { Trigger } from '@dxos/async';
import { Resource } from '@dxos/context';
import { log } from '@dxos/log';

import { initDiagnostics } from './diagnostics';
import { type ReplicantEnv } from './interface';
import { ReplicantRpcServer } from './replicant-rpc-server';
import { type ReplicantParams } from '../plan';
import { createRedisRpcPort } from '../redis';

export { type RedisOptions };

export class ReplicantEnvImpl extends Resource implements ReplicantEnv {
  /**
   *  Redis client for data exchange.
   */
  private readonly _redis: Redis;

  /**
   *  Redis client for subscribing to sync events.
   */
  private readonly _redisSub: Redis;

  /**
   * Redis client for submitting RPC requests.
   */
  private readonly _rpcRequests: Redis;

  /**
   * Redis client for pulling RPC responses.
   * This client uses blocking pop operation to wait for responses
   * so we need different clients for RPC requests and responses.
   */
  private readonly _rpcResponses: Redis;

  private _replicantRpcServer!: ReplicantRpcServer;

  constructor(
    public params: ReplicantParams,
    public redisOptions: RedisOptions,
  ) {
    super();
    this._redis = new Redis(redisOptions);
    this._redisSub = new Redis(redisOptions);
    this._rpcRequests = new Redis(redisOptions);
    this._rpcResponses = new Redis(redisOptions);

    this._redis.on('error', (err) => log.info('Redis Client Error', err));
    this._redisSub.on('error', (err) => log.info('Redis Client Error', err));
  }

  setReplicant(replicant: any) {
    this._replicantRpcServer = new ReplicantRpcServer({
      handler: replicant,
      port: createRedisRpcPort({
        sendClient: this._rpcRequests,
        receiveClient: this._rpcResponses,
        sendQueue: this.params.redisPortSendQueue,
        receiveQueue: this.params.redisPortReceiveQueue,
      }),
    });
  }

  protected override async _open() {
    const disableDiagnostics = initDiagnostics();
    this._ctx.onDispose(() => disableDiagnostics?.());

    await this._redis.config('SET', 'notify-keyspace-events', 'AKE');
    await this._redisSub.config('SET', 'notify-keyspace-events', 'AKE');

    await this._replicantRpcServer.open();
  }

  protected override async _close() {
    await this._replicantRpcServer.close();

    this._redis.disconnect();
    this._redisSub.disconnect();
    this._rpcRequests.disconnect();
    this._rpcResponses.disconnect();
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
      await this._redis.set(`${syncKey}:data:${this.params.replicantId}`, JSON.stringify(data));
    }
    await this._barrier(syncKey, amount);

    const values = await this._redis.keys(`${syncKey}:data:*`);
    const dataValues = await this._redis.mget(values);
    const result = dataValues.map((value) => JSON.parse(value!));
    return result;
  }

  private async _barrier(syncKey: string, count: number) {
    const done = new Trigger();
    const listener: Callback<unknown> = async (error, result) => {
      const value = await this._redis.get(syncKey);

      if (parseInt(value!) === count) {
        done.wake();
      }
    };
    this._redisSub.on('message', listener);
    await this._redisSub.subscribe(`__keyspace@0__:${syncKey}`);

    await this._redis.incr(syncKey);
    await done.wait();

    this._redisSub.off('message', listener);
    await this._redisSub.unsubscribe(`__keyspace@0__:${syncKey}`);
  }
}
