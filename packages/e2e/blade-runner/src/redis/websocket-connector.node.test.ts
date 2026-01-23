//
// Copyright 2023 DXOS.org
//

import Redis, { type RedisOptions } from 'ioredis';
import { describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout } from '@dxos/async';
import { PublicKey } from '@dxos/keys';

import { ReplicantEnvImpl } from '../env';
import { type ReplicantProps } from '../plan';

import { WebSocketConnector } from './websocket-connector';
import { WebSocketRedisProxy } from './websocket-redis-proxy';

/**
 * NOTE(mykola): This test is disabled because it requires a running Redis server.
 *               `redis-server --port 6378` to start a Redis server on port 6378.
 * TODO(mykola): Mock Redis server.
 */
describe.skip('AgentEnv with WebSocketConnector', () => {
  test('set value', async () => {
    const server = new WebSocketRedisProxy({
      redisTCPConnection: {
        host: 'localhost',
        port: 6379,
        family: 4,
      },
      websocketServer: {
        host: 'localhost',
        port: 8080,
      },
    });
    onTestFinished(() => server.destroy());

    const client = new Redis({ Connector: WebSocketConnector, address: 'ws://localhost:8080' } as RedisOptions);
    onTestFinished(() => client.disconnect());

    const key = 'lastTimeframe';
    const value = PublicKey.random().toString();
    await client.set(key, value);
    expect(await asyncTimeout(client.get(key), 1000)).to.equal(value);
  });

  test('sync barrier', async () => {
    const server = new WebSocketRedisProxy({
      redisTCPConnection: {
        host: 'localhost',
        port: 6379,
        family: 4,
      },
      websocketServer: {
        host: 'localhost',
        port: 8080,
      },
    });
    onTestFinished(() => server.destroy());

    const agents = Array(10).fill(0);
    const testId = PublicKey.random().toString();
    const envs = agents.map(
      () =>
        new ReplicantEnvImpl(
          {
            agents,
            testId,
          } as unknown as ReplicantProps,
          { Connector: WebSocketConnector, address: 'ws://localhost:8080' } as RedisOptions,
        ),
    );

    await Promise.all(envs.map((env) => env.open()));
    onTestFinished(() => Promise.all(envs.map((env) => env.close())));

    const promises = [];
    for (const env of envs) {
      promises.push(env.syncBarrier('testing sync barrier', agents.length));
    }

    await asyncTimeout(Promise.all(promises), 5000);
  });
});
