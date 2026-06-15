//
// Copyright 2026 DXOS.org
//

import { RolldownMagicString } from 'rolldown';
import { parseAst } from 'rolldown/parseAst';
import { describe, test } from 'vitest';

import { DEFAULT_LOG_META_TRANSFORM_SPEC, type LogMetaTransformSpec } from './definitions.ts';
import { transform } from './transform.ts';

/**
 * Core transform only (no Rolldown id / moduleType / exclude filters): `meta.ast` + MagicString.
 */
const runTransform = (
  filename: string,
  code: string,
  specs: LogMetaTransformSpec[] = DEFAULT_LOG_META_TRANSFORM_SPEC,
): string => {
  const program = parseAst(code, { astType: 'ts', lang: 'ts' });
  const magicString = new RolldownMagicString(code);
  transform(magicString, program, filename, { specs });
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

      log("hello",void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
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

      dxosLog('hi',void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
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

      log('hi',void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
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

      log.debug('d',void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
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

      dbg('probe',{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,A:["'probe'"]});
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

      new Context(void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2});
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

      invariant(true,void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this,A:["true",""]});
      "
    `);
  });

  test('invariant with trailing comma', ({ expect }) => {
    const code = sourceCode`
    import { invariant } from '@dxos/invariant';
    invariant(
      condition,
      'message',
    );
    `;
    const result = runTransform('src/module.ts', code);
    expect(result).not.toContain(',,');
    expect(result).toMatchInlineSnapshot(`
      "import { invariant } from '@dxos/invariant';
      var __dxlog_file="src/module.ts";

      invariant(
        condition,
        'message',
      {"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this,A:["condition","'message'"]});
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

      log(1,void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
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


      log('x',void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:5,S:this});
      dbg({ k: 1 },{"~LogMeta":"~LogMeta",F:__dxlog_file,L:6,A:["{ k: 1 }"]});
      invariant(cond,void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:7,S:this,A:["cond",""]});
      new Context(void 0,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:8});
      "
    `);
  });
});

describe('param_index: last', () => {
  const lastSpec: LogMetaTransformSpec[] = [
    {
      name: 'trace',
      package: '@dxos/log',
      param_index: 'last',
      include_args: false,
      include_call_site: false,
      include_scope: true,
    },
  ];

  test('appends meta after a single argument', ({ expect }) => {
    const code = sourceCode`
    import { trace } from '@dxos/log';
    trace('hi');
    `;
    expect(runTransform('src/module.ts', code, lastSpec)).toMatchInlineSnapshot(`
      "import { trace } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      trace('hi',{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
      "
    `);
  });

  test('appends meta after multiple arguments (no skip on arity)', ({ expect }) => {
    const code = sourceCode`
    import { trace } from '@dxos/log';
    trace('a', 'b', 'c');
    `;
    expect(runTransform('src/module.ts', code, lastSpec)).toMatchInlineSnapshot(`
      "import { trace } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      trace('a', 'b', 'c',{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
      "
    `);
  });

  test('appends meta on zero-argument call', ({ expect }) => {
    const code = sourceCode`
    import { trace } from '@dxos/log';
    trace();
    `;
    expect(runTransform('src/module.ts', code, lastSpec)).toMatchInlineSnapshot(`
      "import { trace } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      trace({"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
      "
    `);
  });

  test('preserves trailing comma without adding a duplicate', ({ expect }) => {
    const code = sourceCode`
    import { trace } from '@dxos/log';
    trace(
      'x',
      'y',
    );
    `;
    const result = runTransform('src/module.ts', code, lastSpec);
    expect(result).not.toContain(',,');
    expect(result).toMatchInlineSnapshot(`
      "import { trace } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      trace(
        'x',
        'y',
      {"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,S:this});
      "
    `);
  });

  test('captures all args when include_args is true', ({ expect }) => {
    const variadicSpec: LogMetaTransformSpec[] = [
      {
        name: 'trace',
        package: '@dxos/log',
        param_index: 'last',
        include_args: true,
        include_call_site: false,
        include_scope: false,
      },
    ];
    const code = sourceCode`
    import { trace } from '@dxos/log';
    trace(a, b, c);
    `;
    expect(runTransform('src/module.ts', code, variadicSpec)).toMatchInlineSnapshot(`
      "import { trace } from '@dxos/log';
      var __dxlog_file="src/module.ts";

      trace(a, b, c,{"~LogMeta":"~LogMeta",F:__dxlog_file,L:2,A:["a","b","c"]});
      "
    `);
  });
});
