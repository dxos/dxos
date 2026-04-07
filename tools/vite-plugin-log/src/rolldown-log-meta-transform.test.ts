//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'vitest';
import { parseAst } from 'rolldown/parseAst';
import { RolldownMagicString } from 'rolldown';

import type { LogMetaTransformSpec } from './rolldown-log-meta-types';
import {
  collectImportBindings,
  computeLogMetaEdits,
  type LogMetaEdit,
  preambleInsertIndex,
} from './rolldown-log-meta-transform';

const parseTs = (code: string) => parseAst(code, { astType: 'ts', lang: 'ts' });

function applyEdits(code: string, edits: LogMetaEdit[]): string {
  const ms = new RolldownMagicString(code);
  for (const { pos, text } of [...edits].sort((a, b) => b.pos - a.pos)) {
    ms.appendLeft(pos, text);
  }
  return ms.toString();
}

const logSpec: LogMetaTransformSpec = {
  name: 'log',
  package: '@dxos/log',
  param_index: 2,
  include_args: false,
  include_call_site: true,
  include_scope: true,
};

const contextSpec: LogMetaTransformSpec = {
  name: 'Context',
  package: '@dxos/context',
  param_index: 1,
  include_args: false,
  include_call_site: false,
  include_scope: false,
};

const invariantSpec: LogMetaTransformSpec = {
  name: 'invariant',
  package: '@dxos/invariant',
  param_index: 2,
  include_args: true,
  include_call_site: false,
  include_scope: true,
};

describe('collectImportBindings', () => {
  it('maps renamed named imports to transform spec', () => {
    const code = `import { log as dxosLog } from '@dxos/log';\n`;
    const program = parseTs(code);
    const map = collectImportBindings(program, [logSpec]);
    expect(map.get('dxosLog')).toEqual(logSpec);
    expect(map.has('log')).toBe(false);
  });

  it('ignores packages not listed in specs', () => {
    const code = `import { log } from 'debug';\n`;
    const program = parseTs(code);
    const map = collectImportBindings(program, [logSpec]);
    expect(map.size).toBe(0);
  });
});

describe('preambleInsertIndex', () => {
  it('places insertion after consecutive leading imports', () => {
    const code = `import a from 'a';\nimport { b } from 'b';\nconsole.log(1);\n`;
    const program = parseTs(code);
    expect(code.slice(0, preambleInsertIndex(program))).toMatch(/import \{ b \} from 'b';$/);
  });
});

describe('computeLogMetaEdits', () => {
  it('returns empty when no matching imports', () => {
    const code = `import { log } from 'other';\nlog(1);\n`;
    const program = parseTs(code);
    expect(computeLogMetaEdits(program, code, [logSpec], 'x.ts')).toEqual([]);
  });

  it('returns empty when to_transform is empty', () => {
    const code = `import { log } from '@dxos/log';\n`;
    const program = parseTs(code);
    expect(computeLogMetaEdits(program, code, [], 'x.ts')).toEqual([]);
  });

  it('injects void 0 slot and meta for log(message)', () => {
    const code = `import { log } from '@dxos/log';\nlog('hi');\n`;
    const program = parseTs(code);
    const out = applyEdits(code, computeLogMetaEdits(program, code, [logSpec], 'src/a.ts'));
    expect(out).toContain('var __dxlog_file=');
    expect(out).toContain(`"src/a.ts"`);
    expect(out).toMatch(/log\('hi',void 0,\{F:__dxlog_file,L:\d+,S:this,C:\(f,a\)=>f\(\.\.\.a\)\}\)/);
  });

  it('transforms log.debug via member expression on bound import', () => {
    const code = `import { log } from '@dxos/log';\nlog.debug('d');\n`;
    const program = parseTs(code);
    const out = applyEdits(code, computeLogMetaEdits(program, code, [logSpec], 'x.ts'));
    expect(out).toContain('log.debug');
    expect(out).toMatch(/log\.debug\('d',void 0,\{/);
  });

  it('skips when meta argument already provided at param_index', () => {
    const code = `import { log } from '@dxos/log';\nlog('a', {}, { custom: 1 });\n`;
    const program = parseTs(code);
    const out = applyEdits(code, computeLogMetaEdits(program, code, [logSpec], 'x.ts'));
    expect(out).toContain("log('a', {}, { custom: 1 })");
    expect(out).not.toMatch(/void 0,\{F:__dxlog_file/);
  });

  it('transforms new Context() with context spec', () => {
    const code = `import { Context } from '@dxos/context';\nnew Context();\n`;
    const program = parseTs(code);
    const out = applyEdits(code, computeLogMetaEdits(program, code, [contextSpec], 'x.ts'));
    expect(out).toMatch(/new Context\(void 0,\{F:__dxlog_file,L:\d+\}\)/);
    expect(out).not.toContain('S:this');
  });

  it('includes A snippets when include_args is true', () => {
    const code = `import { invariant } from '@dxos/invariant';\ninvariant(true);\n`;
    const program = parseTs(code);
    const out = applyEdits(code, computeLogMetaEdits(program, code, [invariantSpec], 'x.ts'));
    expect(out).toMatch(/A:\["true",""\]/);
  });

  it('does not transform shadowed log identifier', () => {
    const code = `const log = () => {};\nlog('x');\n`;
    const program = parseTs(code);
    const edits = computeLogMetaEdits(program, code, [logSpec], 'x.ts');
    expect(edits).toEqual([]);
  });
});
