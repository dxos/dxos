//
// Copyright 2022 DXOS.org
//

import { createDefaultMapFromCDN, createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
// import * as lzstring from 'lz-string';
import ts from 'typescript';

import { describe, test } from '@dxos/test';

// TODO(burdon):
//  https://github.com/val-town/codemirror-ts
//  https://www.npmjs.com/package/@typescript/vfs
//  https://discuss.codemirror.net/t/codemirror-6-and-typescript-lsp/3398/11
//  https://observablehq.com/blog/bringing-the-typescript-language-server-to-observable

// TODO(burdon): Worker: https://github.com/val-town/codemirror-ts?tab=readme-ov-file#setup-worker
// TODO(burdon): https://github.com/asadm/codemirror-copilot

describe('Typescript VFS', () => {
  test('Basic', async () => {
    const compilerOptions = {
      target: ts.ScriptTarget.ES2022,
    };

    // TODO(burdon): Set cache to true in browser (requires localstorage).
    const cache = false;
    const fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, cache, ts);
    const system = createSystem(fsMap);
    const env = createVirtualTypeScriptEnvironment(system, [], ts, compilerOptions);

    env.createFile('index.ts', 'console.log("Hello, World!");');

    const x = env.getSourceFile('index.ts');
    console.log(x);

    // {
    //   const host = createVirtualCompilerHost(system, compilerOptions, ts);
    //   const program = ts.createProgram({
    //     rootNames: [...fsMap.keys()],
    //     options: compilerOptions,
    //     host: host.compilerHost,
    //   });
    //
    //   const result = program.emit();
    //   console.log(result);
    //
    //   const index = program.getSourceFile('index.ts');
    //   console.log(index);
    //   expect(index).to.exist;
    // }
  });
});
