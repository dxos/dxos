//
// Copyright 2022 DXOS.org
//

import { getAutocompletion, getLints } from '@valtown/codemirror-ts';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { TS } from './ts';

// TODO(burdon): Clean-up docs and TODOs.
// TODO(burdon): react-buddy for storybook?
//  https://www.typescriptlang.org/play
//  https://www.npmjs.com/package/@typescript/vfs
//  https://discuss.codemirror.net/t/codemirror-6-and-typescript-lsp/3398/11
//  https://observablehq.com/blog/bringing-the-typescript-language-server-to-observable
//  https://github.com/val-town/codemirror-ts
//  https://github.com/asadm/codemirror-copilot
//  https://davidmyers.dev/blog/how-to-build-a-code-editor-with-codemirror-6-and-typescript/introduction

describe('Typescript VFS', () => {
  test('Basic', async () => {
    const path = 'index.ts';

    const ts = new TS();
    await ts.initialize();

    {
      const content = ['const value = 100;'].join('\n');
      ts.env.createFile(path, content);
      const file = ts.env.getSourceFile(path);
      expect(file).to.exist;

      const lints = getLints({ env: ts.env, path });
      expect(lints).to.have.length(0);
    }

    {
      const content = ['const value = 100;', 'console.'].join('\n');
      ts.env.updateFile(path, content);

      const completions = await getAutocompletion({
        env: ts.env,
        path,
        context: { pos: content.length, explicit: true },
      });
      const completion = completions?.options.find(({ label }) => label === 'log');
      expect(completion).to.exist;
    }

    {
      const content = ['const value = 100;', 'console.log('].join('\n');
      ts.env.updateFile(path, content);

      const completions = await getAutocompletion({
        env: ts.env,
        path,
        context: { pos: content.length, explicit: true },
      });
      const completion = completions?.options.find(({ label }) => label === 'value');
      expect(completion).to.exist;
    }
  });
});
