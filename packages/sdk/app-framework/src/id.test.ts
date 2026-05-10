//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { id, isWellFormedId, isWellFormedIdPart } from './id';

describe('id', () => {
  test('accepts a single lowercase part', ({ expect }) => {
    expect(id`foo`).toBe('foo');
  });

  test('accepts a dot-delimited id', ({ expect }) => {
    expect(id`org.dxos.plugin.deck`).toBe('org.dxos.plugin.deck');
  });

  test('accepts alphanumeric characters after the leading lowercase letter', ({ expect }) => {
    expect(id`foo123.barBaz`).toBe('foo123.barBaz');
  });

  test('interpolates values', ({ expect }) => {
    const namespace = 'org.dxos';
    const name = 'plugin';
    expect(id`${namespace}.${name}.deck`).toBe('org.dxos.plugin.deck');
  });

  test('throws on empty string', ({ expect }) => {
    expect(() => id``).toThrow(/Invalid id/);
  });

  test('throws when a part starts with an uppercase letter', ({ expect }) => {
    expect(() => id`Foo.bar`).toThrow(/Invalid id/);
  });

  test('throws when a part starts with a digit', ({ expect }) => {
    expect(() => id`1foo.bar`).toThrow(/Invalid id/);
  });

  test('throws on leading or trailing dot', ({ expect }) => {
    expect(() => id`.foo`).toThrow(/Invalid id/);
    expect(() => id`foo.`).toThrow(/Invalid id/);
  });

  test('throws on consecutive dots', ({ expect }) => {
    expect(() => id`foo..bar`).toThrow(/Invalid id/);
  });

  test('throws on disallowed characters', ({ expect }) => {
    expect(() => id`foo-bar`).toThrow(/Invalid id/);
    expect(() => id`foo_bar`).toThrow(/Invalid id/);
    expect(() => id`foo bar`).toThrow(/Invalid id/);
  });

  test('throws when an interpolated value introduces an invalid part', ({ expect }) => {
    const bad = 'Bad';
    expect(() => id`org.${bad}`).toThrow(/Invalid id/);
  });
});

describe('isWellFormedId', () => {
  test('matches valid ids', ({ expect }) => {
    expect(isWellFormedId('foo')).toBe(true);
    expect(isWellFormedId('org.dxos.plugin.deck')).toBe(true);
    expect(isWellFormedId('a1.b2.c3')).toBe(true);
  });

  test('rejects invalid ids', ({ expect }) => {
    expect(isWellFormedId('')).toBe(false);
    expect(isWellFormedId('Foo')).toBe(false);
    expect(isWellFormedId('1foo')).toBe(false);
    expect(isWellFormedId('foo.')).toBe(false);
    expect(isWellFormedId('.foo')).toBe(false);
    expect(isWellFormedId('foo..bar')).toBe(false);
    expect(isWellFormedId('foo-bar')).toBe(false);
  });
});

describe('isWellFormedIdPart', () => {
  test('matches valid parts', ({ expect }) => {
    expect(isWellFormedIdPart('foo')).toBe(true);
    expect(isWellFormedIdPart('fooBar123')).toBe(true);
  });

  test('rejects parts containing dots or invalid characters', ({ expect }) => {
    expect(isWellFormedIdPart('foo.bar')).toBe(false);
    expect(isWellFormedIdPart('Foo')).toBe(false);
    expect(isWellFormedIdPart('1foo')).toBe(false);
    expect(isWellFormedIdPart('')).toBe(false);
  });
});
