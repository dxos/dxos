//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type FactGroup, RDF } from '@dxos/pipeline-rdf';

import { buildMatrix, predicateLabel, rankGroups } from './analytics.ts';

const group = (keys: string[], count: number): FactGroup => ({ keys, count });

describe('rankGroups', () => {
  test('sorts busiest first and sizes each bar against the busiest row', () => {
    const rows = rankGroups([group(['bob'], 2), group(['alice'], 8), group(['dxos'], 4)]);
    expect(rows.map((row) => row.key)).toEqual(['alice', 'dxos', 'bob']);
    expect(rows.map((row) => row.fraction)).toEqual([1, 0.5, 0.25]);
  });

  test('breaks a tie by key, so the same counts always render in the same order', () => {
    const rows = rankGroups([group(['zoe'], 3), group(['adam'], 3)]);
    expect(rows.map((row) => row.key)).toEqual(['adam', 'zoe']);
  });

  test('prefers a stated label, else humanizes the key', () => {
    const rows = rankGroups([group(['q3-board-meeting'], 1), group(['dxos'], 1)], {
      labels: new Map([['dxos', 'DXOS']]),
    });
    expect(rows.map((row) => row.label).sort()).toEqual(['DXOS', 'Q3 Board Meeting']);
  });

  test('is empty, not NaN, with no groups', () => {
    expect(rankGroups([])).toEqual([]);
  });

  test('drops a group with no key rather than rendering a blank row', () => {
    expect(rankGroups([group([], 5), group(['alice'], 1)]).map((row) => row.key)).toEqual(['alice']);
  });
});

describe('buildMatrix', () => {
  const rows = [group(['alice'], 5), group(['bob'], 3)];
  const byRow = new Map<string, FactGroup[]>([
    ['alice', [group(['worksFor'], 3), group(['met'], 2)]],
    ['bob', [group(['worksFor'], 2), group(['leads'], 1)]],
  ]);

  test('keeps the busiest columns across the rows shown', () => {
    const matrix = buildMatrix(rows, byRow, { columns: 2 });
    expect(matrix.rows.map((row) => row.key)).toEqual(['alice', 'bob']);
    // `worksFor` totals 5 across the rows, `met` 2 and `leads` 1, so `leads` falls outside two columns.
    expect(matrix.columns.map((column) => column.key)).toEqual(['worksFor', 'met']);
  });

  test('reads a cell, and an absent pair as zero rather than undefined', () => {
    const matrix = buildMatrix(rows, byRow);
    expect(matrix.cell('alice', 'worksFor')).toBe(3);
    expect(matrix.cell('alice', 'leads')).toBe(0);
    expect(matrix.cell('nobody', 'worksFor')).toBe(0);
  });

  test('scales shading to the busiest cell that is shown, not to one dropped with its column', () => {
    const dominant = new Map<string, FactGroup[]>([['alice', [group(['worksFor'], 1), group(['hidden'], 99)]]]);
    const matrix = buildMatrix([group(['alice'], 100)], dominant, { columns: 1 });
    expect(matrix.columns.map((column) => column.key)).toEqual(['hidden']);
    expect(matrix.max).toBe(99);
  });

  test('is empty, not malformed, with no rows', () => {
    const matrix = buildMatrix([], new Map());
    expect(matrix.rows).toEqual([]);
    expect(matrix.columns).toEqual([]);
    expect(matrix.max).toBe(0);
  });
});

describe('predicateLabel', () => {
  test("prefers the ontology's label over the IRI's local name", () => {
    // `schema:jobTitle` reads as `has role`, which its local name alone would never give.
    expect(predicateLabel('https://schema.org/jobTitle', RDF.Ontology.DEFAULT)).toBe('has role');
    expect(RDF.Ontology.labelFromIri('https://schema.org/jobTitle')).toBe('job title');
  });

  test("falls back to an unknown IRI's local name", () => {
    expect(predicateLabel('https://dxos.org/semantic/brain/local/shippedTo', RDF.Ontology.DEFAULT)).toBe('shipped to');
  });
});
