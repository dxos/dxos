//
// Copyright 2022 DXOS.org
//

import { getAutocompletion, getLints } from '@valtown/codemirror-ts';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { createEnv } from './ts';

// TODO(burdon):
//  https://github.com/val-town/codemirror-ts
//  https://www.npmjs.com/package/@typescript/vfs
//  https://discuss.codemirror.net/t/codemirror-6-and-typescript-lsp/3398/11
//  https://observablehq.com/blog/bringing-the-typescript-language-server-to-observable

// https://www.typescriptlang.org/play

// TODO(burdon): Worker: https://github.com/val-town/codemirror-ts?tab=readme-ov-file#setup-worker
// TODO(burdon): https://github.com/asadm/codemirror-copilot

describe('Typescript VFS', () => {
  test('Basic', async () => {
    const path = 'index.ts';

    const env = await createEnv(false);

    {
      const content = ['const value = 100;'].join('\n');
      env.createFile(path, content);
      const file = env.getSourceFile(path);
      expect(file).to.exist;

      const lints = getLints({ env, path });
      expect(lints).to.have.length(0);
    }

    {
      const content = ['const value = 100;', 'console.'].join('\n');
      env.updateFile(path, content);

      const completions = await getAutocompletion({ env, path, context: { pos: content.length, explicit: true } });
      const completion = completions?.options.find(({ label }) => label === 'log');
      expect(completion).to.exist;
    }

    {
      const content = ['const value = 100;', 'console.log('].join('\n');
      env.updateFile(path, content);

      const completions = await getAutocompletion({ env, path, context: { pos: content.length, explicit: true } });
      const completion = completions?.options.find(({ label }) => label === 'value');
      expect(completion).to.exist;
    }
  });
});
