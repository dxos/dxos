//
// Copyright 2023 DXOS.org
//

import { type Callback, Redis, type RedisOptions } from 'ioredis';

import { Trigger } from '@dxos/async';

import { type AgentParams } from '../spec';

export const REDIS_PORT = 6379;

export class AgentEnv<S, C> {
  private _options: RedisOptions = {};

  public redis: Redis = new Redis(this._options);

  // Redis client for subscribing to sync events.
  public redisSub: Redis = new Redis(this._options);

  // TODO(burdon): Unbind on close.
  constructor(public params: AgentParams<S, C>) {
    this.redis.on('error', (err) => console.log('Redis Client Error', err));
    this.redisSub.on('error', (err) => console.log('Redis Client Error', err));
  }

  async open() {
    await this.redis.config('SET', 'notify-keyspace-events', 'AKE');
    await this.redisSub.config('SET', 'notify-keyspace-events', 'AKE');
  }

  async close() {
    this.redis.disconnect();
    this.redisSub.disconnect();
  }

  async syncBarrier(key: string) {
    const done = new Trigger();
    const agentCount = Object.keys(this.params.agents).length;
    const syncKey = `${this.params.testId}:${key}`;

    const listener: Callback<unknown> = async (error, result) => {
      // await sleep(100);
      const value = await this.redis.get(syncKey);

      if (parseInt(value!) === agentCount) {
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
