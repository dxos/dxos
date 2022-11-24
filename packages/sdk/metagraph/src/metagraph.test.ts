//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { Module } from '@dxos/protocols/proto/dxos/config';

import { Metagraph } from './metagraph';
import { TestServer } from './testing';

const SERVER_URL = 'http://localhost:8080/modules';
// const SERVER_URL = 'https://dev.kube.dxos.org/.well-known/dx/registry';

const modules: Module[] = Array.from(Array(6)).map((_, i) => ({
  name: `test-${i + 1}`,
  displayName: `App ${i + 1}`
}));

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

    const observable = await metagraph.modules.query();
    observable.subscribe({
      onUpdate(results: Module[]) {
        log('onUpdate', { results });
        expect(results).to.have.length(modules.length);
      }
    });

    const results = observable.results;
    expect(results).to.have.length(modules.length);
  });
});
