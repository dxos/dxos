//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { SKIP, createReplacer, safeStringify } from './safe-stringify';

describe('safeStringify', () => {
  test('stringifies plain nested objects', ({ expect }) => {
    const data = { a: 1, b: { c: 'hello' } };
    const result = safeStringify(data);
    expect(result).to.include('"a": 1');
    expect(result).to.include('"b"');
    expect(result).to.include('"c": "hello"');
  });

  test('handles circular references (Cycle story)', ({ expect }) => {
    const cycle: Record<string, unknown> = { a: 1, b: [] };
    (cycle.b as unknown[]).push(cycle);

    const result = safeStringify(cycle);
    expect(result).to.include('"a": 1');
    expect(result).to.include('=> $]');
    expect(result).to.match(/\[\$\.b\.\d+ => \$\]/);
  });

  test('handles multiple circular references', ({ expect }) => {
    const obj: Record<string, unknown> = { x: 1 };
    obj.self = obj;

    const result = safeStringify(obj);
    expect(result).to.include('"x": 1');
    expect(result).to.include('[$.self => $]');
  });

  test('filters functions', ({ expect }) => {
    const data = { a: 1, fn: () => {} };
    const result = safeStringify(data);
    expect(result).to.include('"a": 1');
    expect(result).not.to.include('fn');
  });

  test('filters exotic objects', ({ expect }) => {
    class Custom {}
    const data = { a: 1, exotic: new Custom() };
    const result = safeStringify(data);
    expect(result).to.include('"a": 1');
    expect(result).not.to.include('exotic');
  });

  test('preserves arrays', ({ expect }) => {
    const data = { arr: [1, 2, 3] };
    const result = safeStringify(data);
    expect(result).to.include('"arr"');
    expect(result).to.include('1');
    expect(result).to.include('2');
    expect(result).to.include('3');
  });
});

describe('createReplacer', () => {
  test('maxArrayLen truncates long arrays (Large story)', ({ expect }) => {
    const data = { arr: Array.from({ length: 15 }, (_, index) => index) };
    const result = safeStringify(data, createReplacer({ maxArrayLen: 10 }));
    expect(result).to.include('"[length: 15]"');
  });

  test('maxStringLen truncates long strings (Large story)', ({ expect }) => {
    const data = { str: 'a'.repeat(20) };
    const result = safeStringify(data, createReplacer({ maxStringLen: 10 }));
    expect(result).to.include('"aaaaaaaaaa..."');
  });

  test('omit skips specified keys', ({ expect }) => {
    const data = { a: 1, secret: 'hide', b: 2 };
    const result = safeStringify(data, createReplacer({ omit: ['secret'] }));
    expect(result).to.include('"a": 1');
    expect(result).to.include('"b": 2');
    expect(result).not.to.include('secret');
  });

  test('parse parses JSON string values', ({ expect }) => {
    const data = { nested: '{"x":1}' };
    const result = safeStringify(data, createReplacer({ parse: ['nested'] }));
    expect(result).to.include('"x": 1');
  });

  test('SKIP return value removes key from output', ({ expect }) => {
    const customReplacer = (_key: string, value: unknown) => (_key === 'skip' ? SKIP : value);
    const data = { a: 1, skip: 'hidden' };
    const result = safeStringify(data, customReplacer);
    expect(result).to.include('"a": 1');
    expect(result).not.to.include('skip');
  });
});
