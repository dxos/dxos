//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from 'vitest';
import { parseAst } from 'rolldown/parseAst';
import { RolldownMagicString } from 'rolldown';

import { rolldownLogMetaPlugin } from './rolldown-log-meta-plugin';

describe('rolldownLogMetaPlugin', () => {
  const specs = [
    {
      name: 'log',
      package: '@dxos/log',
      param_index: 2,
      include_args: false,
      include_call_site: true,
      include_scope: true,
    },
  ] as const;

  it('exposes expected plugin name', () => {
    const p = rolldownLogMetaPlugin({ to_transform: [...specs] });
    expect(p.name).toBe('dxos:rolldown-log-meta');
  });

  it('returns null for excluded ids', () => {
    const p = rolldownLogMetaPlugin({ to_transform: [...specs] });
    const hook = p.transform;
    if (typeof hook !== 'object' || !('handler' in hook)) {
      throw new Error('expected transform hook object');
    }
    const code = `import { log } from '@dxos/log';\nlog(1);\n`;
    const program = parseAst(code, { astType: 'ts', lang: 'ts' });
    const meta = {
      moduleType: 'ts',
      ast: program,
      magicString: new RolldownMagicString(code),
    };
    expect(hook.handler(code, '/path/node_modules/pkg/index.ts', meta)).toBeNull();
  });

  it('returns null when moduleType is not JS/TS', () => {
    const p = rolldownLogMetaPlugin({ to_transform: [...specs] });
    const hook = p.transform;
    if (typeof hook !== 'object' || !('handler' in hook)) {
      throw new Error('expected transform hook object');
    }
    const code = `{}`;
    const program = parseAst(code, { astType: 'ts', lang: 'ts' });
    const meta = {
      moduleType: 'json',
      ast: program,
      magicString: new RolldownMagicString(code),
    };
    expect(hook.handler(code, 'data.json', meta)).toBeNull();
  });

  it('returns null when magicString is missing', () => {
    const p = rolldownLogMetaPlugin({ to_transform: [...specs] });
    const hook = p.transform;
    if (typeof hook !== 'object' || !('handler' in hook)) {
      throw new Error('expected transform hook object');
    }
    const code = `import { log } from '@dxos/log';\nlog(1);\n`;
    const program = parseAst(code, { astType: 'ts', lang: 'ts' });
    const meta = { moduleType: 'ts', ast: program };
    expect(hook.handler(code, 'a.ts', meta as any)).toBeNull();
  });

  it('applies transform and returns magicString code', () => {
    const p = rolldownLogMetaPlugin({ to_transform: [...specs], filename: 'virtual.ts' });
    const hook = p.transform;
    if (typeof hook !== 'object' || !('handler' in hook)) {
      throw new Error('expected transform hook object');
    }
    const code = `import { log } from '@dxos/log';\nlog(1);\n`;
    const program = parseAst(code, { astType: 'ts', lang: 'ts' });
    const ms = new RolldownMagicString(code);
    const ret = hook.handler(code, 'a.ts', { moduleType: 'ts', ast: program, magicString: ms });
    expect(ret).not.toBeNull();
    expect(typeof ret).toBe('object');
    expect((ret as { code: RolldownMagicString }).code.toString()).toContain('"virtual.ts"');
  });
});
