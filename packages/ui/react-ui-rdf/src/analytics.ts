//
// Copyright 2026 DXOS.org
//

import { type FactGroup, RDF } from '@dxos/pipeline-rdf';

import { humanize } from './types.ts';

//
// View models for the aggregate overview: pure functions over the counts the store returns, so the explorer's
// arithmetic (ranking, bar widths, the cross-tab's axes) is unit-testable without a store or a renderer.
//

/** One row of a ranked dimension. */
export type RankedRow = {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  /** The count as a share of the busiest row, which is the bar's width. */
  readonly fraction: number;
};

export type RankOptions = {
  /** Display labels by key; a key with none falls back to {@link RankOptions.format}. */
  readonly labels?: ReadonlyMap<string, string>;
  /** How a key with no label reads. */
  readonly format?: (key: string) => string;
};

/**
 * Rank a single-dimension aggregate: labelled rows, busiest first, each sized against the busiest. Bars are
 * scaled to the largest row rather than to the total, so a long tail stays visible.
 */
export const rankGroups = (
  groups: readonly FactGroup[],
  { labels, format = humanize }: RankOptions = {},
): RankedRow[] => {
  const rows = groups.flatMap((group) => {
    const key = group.keys[0];
    return key === undefined ? [] : [{ key, count: group.count }];
  });
  const max = Math.max(0, ...rows.map((row) => row.count));
  return rows
    .slice()
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
    .map((row) => ({
      ...row,
      label: labels?.get(row.key) ?? format(row.key),
      fraction: max === 0 ? 0 : row.count / max,
    }));
};

/** One axis entry of a cross-tab: its key, how it reads, and its total across the other axis. */
export type MatrixAxis = {
  readonly key: string;
  readonly label: string;
  readonly count: number;
};

export type FactMatrix = {
  readonly rows: MatrixAxis[];
  readonly columns: MatrixAxis[];
  /** The busiest cell, which the cell shading is relative to. */
  readonly max: number;
  readonly cell: (row: string, column: string) => number;
};

export type MatrixOptions = {
  readonly rowLabels?: ReadonlyMap<string, string>;
  readonly columnLabels?: ReadonlyMap<string, string>;
  readonly formatRow?: (key: string) => string;
  readonly formatColumn?: (key: string) => string;
  /** How many columns to keep, busiest across the rows first. */
  readonly columns?: number;
};

const DEFAULT_COLUMNS = 8;

/**
 * Assemble a cross-tab from one ranking and a per-row aggregate over the second dimension — the shape the store
 * answers cheaply, since each row is its own bounded, indexed count. Columns are the busiest second-dimension
 * keys across the rows shown, so the grid stays the size of the screen however large the corpus is.
 */
export const buildMatrix = (
  rows: readonly FactGroup[],
  byRow: ReadonlyMap<string, readonly FactGroup[]>,
  {
    rowLabels,
    columnLabels,
    formatRow = humanize,
    formatColumn = humanize,
    columns = DEFAULT_COLUMNS,
  }: MatrixOptions = {},
): FactMatrix => {
  const rowAxis = rankGroups(rows, { labels: rowLabels, format: formatRow }).map(
    ({ key, label, count }): MatrixAxis => ({ key, label, count }),
  );

  const cells = new Map<string, number>();
  const columnTotals = new Map<string, number>();
  for (const row of rowAxis) {
    for (const group of byRow.get(row.key) ?? []) {
      const column = group.keys[0];
      if (column === undefined) {
        continue;
      }
      cells.set(`${row.key}\u0001${column}`, group.count);
      columnTotals.set(column, (columnTotals.get(column) ?? 0) + group.count);
    }
  }

  const columnAxis = [...columnTotals.entries()]
    .sort(([leftKey, left], [rightKey, right]) => right - left || leftKey.localeCompare(rightKey))
    .slice(0, Math.max(0, Math.trunc(columns)))
    .map(([key, count]): MatrixAxis => ({ key, label: columnLabels?.get(key) ?? formatColumn(key), count }));

  const shown = new Set(columnAxis.map((column) => column.key));
  const max = Math.max(
    0,
    ...[...cells.entries()].flatMap(([id, count]) => (shown.has(id.split('\u0001')[1] ?? '') ? [count] : [])),
  );

  return {
    rows: rowAxis,
    columns: columnAxis,
    max,
    cell: (row, column) => cells.get(`${row}\u0001${column}`) ?? 0,
  };
};

/** How a predicate IRI reads: the ontology's label where it defines one, else the IRI's local name. */
export const predicateLabel = (iri: string, ontology: RDF.Ontology.Ontology): string =>
  ontology.get(iri)?.label ?? RDF.Ontology.labelFromIri(iri);
