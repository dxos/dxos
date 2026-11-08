//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { rewriteTopLevel } from './rewrite.ts';

describe('rewriteTopLevel', () => {
  test('top-level declarations become assignments to session globals', () => {
    const { code, names } = rewriteTopLevel('const a = 1;\nlet b = yield* x;\nvar c;\nyield* print(a, b);');
    expect(names).toEqual(['a', 'b', 'c']);
    expect(code).toEqual('a = 1;\nb = yield* x;\n;\nyield* print(a, b);');
  });

  test('destructuring keeps its pattern, an object pattern in parentheses', () => {
    const { code, names } = rewriteTopLevel('const { a, b: [c, ...d], e = 2 } = obj; const [f] = list;');
    expect(names).toEqual(['a', 'c', 'd', 'e', 'f']);
    expect(code).toEqual('({ a, b: [c, ...d], e = 2 } = obj); [f] = list;');
  });

  test('functions are hoisted as assignments, classes assigned in place', () => {
    const { code, names } = rewriteTopLevel('yield* print(f());\nfunction f() { return 1; }\nclass C {}');
    expect(names).toEqual(['f', 'C']);
    expect(code).toEqual('f = function f() { return 1; };\nyield* print(f());\n;\nC = class C {};');
  });

  test('nested scopes are left alone', () => {
    const program =
      'for (const task of tasks) { const x = 1; }\nif (ok) { let y = 2; }\nconst g = () => { const z = 3; };';
    const { code, names } = rewriteTopLevel(program);
    expect(names).toEqual(['g']);
    expect(code).toEqual(
      'for (const task of tasks) { const x = 1; }\nif (ok) { let y = 2; }\ng = () => { const z = 3; };',
    );
  });

  test('a program that does not parse is returned unchanged', () => {
    expect(rewriteTopLevel('const = ;')).toEqual({ code: 'const = ;', names: [] });
  });
});
