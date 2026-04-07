//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';
import { parseAst } from 'rolldown/parseAst';
import { RolldownMagicString } from 'rolldown';

import { DEFAULT_LOG_META_TRANSFORM_SPEC } from './definitions.ts';
import { transform } from './transform.ts';

/**
 * Core transform only (no Rolldown id / moduleType / exclude filters): `meta.ast` + MagicString.
 */
const runTransform = (filename: string, code: string): string => {
  const program = parseAst(code, { astType: 'ts', lang: 'ts' });
  const magicString = new RolldownMagicString(code);
  transform(magicString, program, filename, { specs: DEFAULT_LOG_META_TRANSFORM_SPEC });
  return magicString.toString();
};

const sourceCode = (segments: TemplateStringsArray, ...values: unknown[]) => {
  const lines = segments
    .map((line, index) => {
      if (index < values.length) {
        return line + String(values[index]);
      }
      return line;
    })
    .join('')
    .split('\n');
  if (lines[0]?.trim().length === 0) {
    lines.shift();
  }
  if (lines[lines.length - 1]?.trim().length === 0) {
    lines.pop();
  }
  const nonempty = lines.filter((line) => line.trim().length > 0);
  const longestCommonWhitespace =
    nonempty.length === 0 ? 0 : Math.min(...nonempty.map((line) => line.match(/^\s*/)?.[0].length ?? 0));
  return lines.map((line) => (line.trim().length === 0 ? line : line.slice(longestCommonWhitespace))).join('\n') + '\n';
};

describe('transform', () => {
  test('log("hello")', ({ expect }) => {
    const code = sourceCode`
    import { log } from '@dxos/log';
    log("hello");
    `;
    const result = runTransform('src/module.ts', code);
    expect(result).toMatchInlineSnapshot(`
      "import { log } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      log("hello",void 0,{F:__dxlog_file,L:2,S:this,C:(f,a)=>f(...a)});
      "
    `);
  });

  test('no matching imports', ({ expect }) => {
    const code = sourceCode`
    import { log } from 'other';
    log(1);
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { log } from 'other';
      log(1);
      "
    `);
  });

  test('shadowed log identifier', ({ expect }) => {
    const code = sourceCode`
    const log = () => {};
    log('x');
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "const log = () => {};
      log('x');
      "
    `);
  });

  test('renamed import log as dxosLog', ({ expect }) => {
    const code = sourceCode`
    import { log as dxosLog } from '@dxos/log';
    dxosLog('hi');
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { log as dxosLog } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      dxosLog('hi',void 0,{F:__dxlog_file,L:2,S:this,C:(f,a)=>f(...a)});
      "
    `);
  });

  test('log(message)', ({ expect }) => {
    const code = sourceCode`
    import { log } from '@dxos/log';
    log('hi');
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { log } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      log('hi',void 0,{F:__dxlog_file,L:2,S:this,C:(f,a)=>f(...a)});
      "
    `);
  });

  test('log.debug', ({ expect }) => {
    const code = sourceCode`
    import { log } from '@dxos/log';
    log.debug('d');
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { log } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      log.debug('d',void 0,{F:__dxlog_file,L:2,S:this,C:(f,a)=>f(...a)});
      "
    `);
  });

  test('log skips when meta already at param_index', ({ expect }) => {
    const code = sourceCode`
    import { log } from '@dxos/log';
    log('a', {}, { custom: 1 });
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { log } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      log('a', {}, { custom: 1 });
      "
    `);
  });

  test('dbg with one argument', ({ expect }) => {
    const code = sourceCode`
    import { dbg } from '@dxos/log';
    dbg('probe');
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { dbg } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      dbg('probe',{F:__dxlog_file,L:2,A:["'probe'"]});
      "
    `);
  });

  test('new Context()', ({ expect }) => {
    const code = sourceCode`
    import { Context } from '@dxos/context';
    new Context();
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { Context } from '@dxos/context';
      var __dxlog_file="src/module.ts";

      new Context(void 0,{F:__dxlog_file,L:2});
      "
    `);
  });

  test('invariant with condition', ({ expect }) => {
    const code = sourceCode`
    import { invariant } from '@dxos/invariant';
    invariant(true);
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { invariant } from '@dxos/invariant';
      var __dxlog_file="src/module.ts";

      invariant(true,void 0,{F:__dxlog_file,L:2,S:this,A:["true",""]});
      "
    `);
  });

  test('filename for __dxlog_file', ({ expect }) => {
    const code = sourceCode`
    import { log } from '@dxos/log';
    log(1);
    `;
    expect(runTransform('virtual.ts', code)).toMatchInlineSnapshot(`
      "import { log } from '@dxos/log';
      var __dxlog_file="virtual.ts";

      log(1,void 0,{F:__dxlog_file,L:2,S:this,C:(f,a)=>f(...a)});
      "
    `);
  });

  test('combined log, dbg, invariant, Context', ({ expect }) => {
    const code = sourceCode`
    import { log, dbg } from '@dxos/log';
    import { invariant } from '@dxos/invariant';
    import { Context } from '@dxos/context';

    log('x');
    dbg({ k: 1 });
    invariant(cond);
    new Context();
    `;
    expect(runTransform('src/module.ts', code)).toMatchInlineSnapshot(`
      "import { log, dbg } from '@dxos/log';
      import { invariant } from '@dxos/invariant';
      import { Context } from '@dxos/context';
      var __dxlog_file="src/module.ts";


      log('x',void 0,{F:__dxlog_file,L:5,S:this,C:(f,a)=>f(...a)});
      dbg({ k: 1 },{F:__dxlog_file,L:6,A:["{ k: 1 }"]});
      invariant(cond,void 0,{F:__dxlog_file,L:7,S:this,A:["cond",""]});
      new Context(void 0,{F:__dxlog_file,L:8});
      "
    `);
  });
});
