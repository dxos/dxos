//
// Copyright 2026 DXOS.org
//

// The board's layout schema, reachable without the components: it is pure Effect Schema, but
// exporting it only from the package root forced consumers that need the type — plugin schemas
// reached from headless capability barrels — to pull React in behind it.
export { BoardLayout, CellLayout, Position, Size, defaultLayout } from '../components/Board/types.ts';
