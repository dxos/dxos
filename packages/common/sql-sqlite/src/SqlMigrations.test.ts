//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { splitStatements } from './SqlMigrations';

describe('splitStatements', () => {
  test('splits on statement boundaries and drops empty trailing statements', () => {
    expect(splitStatements('CREATE TABLE a (x TEXT);\nCREATE TABLE b (y TEXT);\n')).toEqual([
      'CREATE TABLE a (x TEXT)',
      'CREATE TABLE b (y TEXT)',
    ]);
  });

  test('keeps a final statement that has no trailing delimiter', () => {
    expect(splitStatements('CREATE TABLE a (x TEXT)')).toEqual(['CREATE TABLE a (x TEXT)']);
  });

  test('ignores a delimiter inside a string literal', () => {
    expect(splitStatements(`CREATE TABLE a (x TEXT NOT NULL DEFAULT ';');`)).toEqual([
      `CREATE TABLE a (x TEXT NOT NULL DEFAULT ';')`,
    ]);
  });

  test('ignores a delimiter inside a quoted identifier', () => {
    expect(splitStatements('CREATE TABLE "weird;name" (x TEXT);')).toEqual(['CREATE TABLE "weird;name" (x TEXT)']);
  });

  test('treats a doubled quote as an escape rather than the end of the span', () => {
    expect(splitStatements(`INSERT INTO a VALUES ('it''s; fine');`)).toEqual([`INSERT INTO a VALUES ('it''s; fine')`]);
  });

  test('ignores a delimiter inside a line comment', () => {
    expect(splitStatements('CREATE TABLE a ( -- one; two\n  x TEXT\n);')).toEqual(['CREATE TABLE a ( \n  x TEXT\n)']);
  });

  test('ignores a delimiter inside a block comment', () => {
    expect(splitStatements('CREATE TABLE a (x TEXT) /* one; two */;')).toEqual(['CREATE TABLE a (x TEXT)']);
  });

  test('drops the header comment emitted by the generator', () => {
    const script = ['--', '-- Generated from prisma/schema.prisma.', '--', 'CREATE TABLE a (x TEXT);'].join('\n');
    expect(splitStatements(script)).toEqual(['CREATE TABLE a (x TEXT)']);
  });

  test('returns nothing for a script that is only comments and whitespace', () => {
    expect(splitStatements('-- nothing here\n\n/* nor here */\n')).toEqual([]);
  });

  test('does not merge tokens across a dropped comment', () => {
    expect(splitStatements('SELECT 1 --comment\n+ 2;')).toEqual(['SELECT 1 \n+ 2']);
  });
});
