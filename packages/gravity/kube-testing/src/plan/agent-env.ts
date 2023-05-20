//
// Copyright 2023 DXOS.org
//

import { createClient, RedisClientType } from 'redis';

import { Trigger } from '@dxos/async';

import { AgentParams } from './spec-base';

const REDIS_URL = 'redis://default:redispw@localhost:55000';

export class AgentEnv<S, C> {
  public redis: RedisClientType = createClient({ url: REDIS_URL });

  // Subscription client
  public redisSub: RedisClientType = createClient({ url: REDIS_URL });

  constructor(public params: AgentParams<S, C>) {
    this.redis.on('error', (err) => console.log('Redis Client Error', err));
    this.redisSub.on('error', (err) => console.log('Redis Client Error', err));
  }

  async open() {
    await this.redis.connect();
    await this.redisSub.connect();
    await this.redis.configSet('notify-keyspace-events', 'AK');
    await this.redisSub.configSet('notify-keyspace-events', 'AK');
  }

  async syncBarrier(key: string) {
    const done = new Trigger();
    const agentCount = Object.keys(this.params.agents).length;
    const syncKey = `${this.params.testId}:${key}`;

    const listener = async (message: any, channel: any) => {
      const value = await this.redis.get(syncKey);
      if (parseInt(value!) === agentCount) {
        done.wake();
      }
    };
    await this.redisSub.subscribe(`__keyspace@0__:${syncKey}`, listener);
    await this.redis.incr(syncKey);
    await done.wait();
    await this.redisSub.unsubscribe(`__keyspace@0__:${syncKey}`, listener);
  }
}
