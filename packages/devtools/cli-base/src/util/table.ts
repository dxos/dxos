//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import chalk from 'chalk';
import Table from 'cli-table3';

export const TABLE_FLAGS = { extended: Flags.boolean({ description: 'Show extended table columns.' }) };

export type TableFlags = {
  extended?: boolean;
};

// TODO(burdon): Type (e.g., boolean), getter.
export type TableColumn = {
  header?: string;
  width?: number;
  primary?: boolean;
  color?: chalk.Chalk;
  extended?: boolean;
  truncate?: boolean;
  get?: (row: any) => string | undefined;
};

export type TableOptions = {
  extended?: boolean;
};

/**
 * https://github.com/cli-table/cli-table3/blob/master/basic-usage.md
 */
export const table = <T extends Record<string, any>>(
  data: T[] = [],
  header: Partial<Record<keyof T, TableColumn>>,
  options: TableOptions = { extended: false },
) => {
  const f = ([_, h]: [string, TableColumn]) => !h.extended || options.extended;
  const t = new Table({
    head: Object.entries<TableColumn>(header as any)
      .filter(f)
      .map(([key, { header }]) => header ?? key),
    colWidths: Object.entries<TableColumn>(header as any)
      .filter(f)
      .map(([_, { width = null }]) => width),
    style: {
      compact: true,
      head: ['green'],
    },
  });

  t.push(
    ...data.map((row) =>
      Object.entries<TableColumn>(header as any)
        .filter(f)
        .map(([key, { color, primary, truncate, get }]) => {
          let value = get ? get(row) : row[key] ?? '';
          if (truncate) {
            value = value.slice(0, 8);
          }
          const c = color ?? (primary && chalk.blue);
          return c ? c(value) : value;
        }),
    ),
  );

  return t.toString();
};
