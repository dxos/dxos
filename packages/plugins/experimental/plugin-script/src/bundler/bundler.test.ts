//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Bundler } from './bundler';

describe('Bundler', () => {
  test('Basic', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle('const x = 100'); // TODO(burdon): Test import.
    expect(result.bundle).to.exist;
    expect(result.error).to.not.exist;
  });

  test('Import', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle(`
      import { Filter } from './runtime.js';

      const query = Filter.typename('dxos.org/type/Example');
    `);
    expect(result.bundle).to.exist;
    expect(result.error).to.not.exist;
  });

  test('HTTPS Import', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle(`
      import { Octokit } from 'https://esm.sh/octokit';
      const octokit = new Octokit();
    `);
    expect(result.bundle).to.exist;
    expect(result.error).to.not.exist;
  });

  test('Error', async () => {
    const bundler = new Bundler({ platform: 'node', sandboxedModules: [], remoteModules: {} });
    const result = await bundler.bundle("import missing from './module'; missing();");
    expect(result.bundle).to.not.exist;
    expect(result.error).to.exist;
  });
});
