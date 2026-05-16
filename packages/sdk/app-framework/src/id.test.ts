//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { id, isWellFormedId, isWellFormedIdPart } from './id';

describe('id', () => {
  test('accepts a three-part id', ({ expect }) => {
    expect(id`com.example.foo`).toBe('com.example.foo');
  });

  test('accepts a four-part id', ({ expect }) => {
    expect(id`org.dxos.plugin.deck`).toBe('org.dxos.plugin.deck');
  });

  test('accepts hyphens in authority segments', ({ expect }) => {
    expect(id`my-org.example.foo`).toBe('my-org.example.foo');
  });

  test('accepts mixed-case name segment', ({ expect }) => {
    expect(id`org.dxos.plugin.deckPlugin`).toBe('org.dxos.plugin.deckPlugin');
  });

  test('accepts alphanumeric characters in authority segments', ({ expect }) => {
    expect(id`foo123.bar456.qux`).toBe('foo123.bar456.qux');
  });

  test('interpolates values', ({ expect }) => {
    const namespace = 'org.dxos';
    const name = 'plugin';
    expect(id`${namespace}.${name}.deck`).toBe('org.dxos.plugin.deck');
  });

  test('throws on empty string', ({ expect }) => {
    expect(() => id``).toThrow(/Invalid id/);
  });

  test('throws for fewer than three parts', ({ expect }) => {
    expect(() => id`foo`).toThrow(/Invalid id/);
    expect(() => id`foo.bar`).toThrow(/Invalid id/);
  });

  test('throws when first character is a digit', ({ expect }) => {
    expect(() => id`1foo.bar.baz`).toThrow(/Invalid id/);
  });

  test('throws on leading or trailing dot', ({ expect }) => {
    expect(() => id`.foo.bar.baz`).toThrow(/Invalid id/);
    expect(() => id`foo.bar.baz.`).toThrow(/Invalid id/);
  });

  test('throws on consecutive dots', ({ expect }) => {
    expect(() => id`foo..bar`).toThrow(/Invalid id/);
  });

  test('throws on hyphens in the name segment', ({ expect }) => {
    expect(() => id`org.example.foo-bar`).toThrow(/Invalid id/);
  });

  test('throws on disallowed characters', ({ expect }) => {
    expect(() => id`foo_bar.baz.qux`).toThrow(/Invalid id/);
    expect(() => id`foo bar.baz.qux`).toThrow(/Invalid id/);
  });

  test('throws when an interpolated value produces an invalid name segment', ({ expect }) => {
    const bad = '1bad';
    expect(() => id`org.dxos.${bad}`).toThrow(/Invalid id/);
  });
});

describe('isWellFormedId', () => {
  test('matches valid ids', ({ expect }) => {
    expect(isWellFormedId('com.example.foo')).toBe(true);
    expect(isWellFormedId('org.dxos.plugin.deck')).toBe(true);
    expect(isWellFormedId('a1.b2.c3')).toBe(true);
    expect(isWellFormedId('my-org.example.foo')).toBe(true);
  });

  test('rejects ids with fewer than three parts', ({ expect }) => {
    expect(isWellFormedId('foo')).toBe(false);
    expect(isWellFormedId('foo.bar')).toBe(false);
  });

  test('rejects invalid ids', ({ expect }) => {
    expect(isWellFormedId('')).toBe(false);
    expect(isWellFormedId('1foo.bar.baz')).toBe(false);
    expect(isWellFormedId('foo.bar.')).toBe(false);
    expect(isWellFormedId('.foo.bar')).toBe(false);
    expect(isWellFormedId('foo..bar.baz')).toBe(false);
    expect(isWellFormedId('org.example.foo-bar')).toBe(false);
  });
});

describe('isWellFormedIdPart', () => {
  test('matches valid name segments', ({ expect }) => {
    expect(isWellFormedIdPart('foo')).toBe(true);
    expect(isWellFormedIdPart('Foo')).toBe(true);
    expect(isWellFormedIdPart('fooBar123')).toBe(true);
  });

  test('rejects invalid name segments', ({ expect }) => {
    expect(isWellFormedIdPart('foo.bar')).toBe(false);
    expect(isWellFormedIdPart('foo-bar')).toBe(false);
    expect(isWellFormedIdPart('1foo')).toBe(false);
    expect(isWellFormedIdPart('')).toBe(false);
  });
});
