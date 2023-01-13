//
// Copyright 2022 DXOS.org
//

// @dxos/test platform=nodejs

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { Module } from '@dxos/protocols/proto/dxos/config';
import { afterAll, beforeAll, describe, test } from '@dxos/test';

import { Metagraph } from './metagraph';
import { TestServer } from './testing';

const modules: Module[] = [
  {
    name: 'test-1',
    displayName: 'App 1'
  },
  {
    name: 'test-2',
    displayName: 'App 2',
    tags: ['prod']
  },
  {
    name: 'test-3',
    displayName: 'App 3',
    tags: ['test']
  },
  {
    name: 'test-4',
    displayName: 'App 4',
    tags: ['prod']
  },
  {
    name: 'test-5',
    displayName: 'App 5',
    tags: ['prod', 'demo']
  }
];

describe('Metagraph queries', () => {
  const testServer = new TestServer({ modules });

  beforeAll(() => {
    testServer.start();
  });

  afterAll(() => {
    testServer.stop();
  });

  test('basic module queries', async () => {
    const metagraph = new Metagraph(
      new Config({
        runtime: {
          services: {
            dxns: {
              // Test with https://dev.kube.dxos.org/.well-known/dx/registry
              server: 'http://localhost:8080/modules'
            }
          }
        }
      })
    );

    {
      const observable = await metagraph.modules.query();
      const results = observable.results;
      expect(results).to.have.length(5);
    }

    {
      const trigger = new Trigger<number>();
      const observable = await metagraph.modules.query({ tags: ['prod'] });
      const unsubscribe = observable.subscribe({
        onUpdate: (results: Module[]) => {
          trigger.wake(results.length);
        }
      });

      const results = observable.results;
      expect(results).to.have.length(3);

      void observable.fetch();
      const count = await trigger.wait();
      expect(count).to.eq(3);
      unsubscribe();
    }
  });
});
