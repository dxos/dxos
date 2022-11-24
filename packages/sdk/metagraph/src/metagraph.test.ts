//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=nodejs

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { Module } from '@dxos/protocols/proto/dxos/config';

import { Metagraph } from './metagraph';
import { TestServer } from './testing';

const SERVER_URL = 'http://localhost:8080/modules';
// const SERVER_URL = 'https://dev.kube.dxos.org/.well-known/dx/registry';

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

describe('Metagraph queries', function () {
  const testServer = new TestServer({ modules });

  before(function () {
    testServer.start();
  });

  after(function () {
    testServer.stop();
  });

  it('basic module queries', async function () {
    const metagraph = new Metagraph(
      new Config({
        runtime: {
          services: {
            dxns: {
              server: SERVER_URL
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
      observable.subscribe({
        onUpdate(results: Module[]) {
          log('onUpdate', { results });
          trigger.wake(results.length);
        }
      });

      const results = observable.results;
      expect(results).to.have.length(3);

      observable.fetch();
      const count = await trigger.wait();
      expect(count).to.eq(3);
    }
  });
});
