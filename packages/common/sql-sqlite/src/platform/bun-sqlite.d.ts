//
// Copyright 2026 DXOS.org
//

// The workspace carries no Bun type definitions; this declares only the `bun:sqlite` surface `sql-storage-bun.ts` uses.
declare module 'bun:sqlite' {
  type Binding = string | number | bigint | null | Uint8Array;

  export class Statement {
    readonly columnNames: string[];
    values(...bindings: Binding[]): unknown[][] | null;
    finalize(): void;
  }

  export class Database {
    constructor(filename?: string);
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
  }
}
