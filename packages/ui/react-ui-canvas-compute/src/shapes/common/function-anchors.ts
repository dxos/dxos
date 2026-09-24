//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { VoidInput, VoidOutput } from '@dxos/conductor';
import { SchemaAST } from '@dxos/effect';
import { type Polygon } from '@dxos/react-ui-canvas-editor';
import { createAnchors, rowHeight } from '@dxos/react-ui-canvas-editor';
import { DEFAULT_GRID } from '@dxos/react-ui-canvas/scene';

import { footerHeight, headerHeight } from '../common/index.ts';
import { createAnchorId } from '../defs.ts';

// Kept out of `FunctionBody.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/** Vertical padding inside the function body; the height maths below depends on it. */
export const bodyPadding = 8;

/**
 * A function shape's height: the chrome plus a body grown to a whole number of grid cells. One row per
 * input is a floor on the body rather than its height, so the box lands on the grid whatever its schema
 * declares — the rows used to set it exactly, and `rowHeight` divides into no grid cell.
 */
export const getHeight = (input: Schema.Schema<any>, unit = DEFAULT_GRID) => {
  const properties = SchemaAST.getPropertySignatures(input.ast);
  const minBody = bodyPadding * 2 + properties.length * rowHeight + 2; // Incl. borders.
  return headerHeight + footerHeight + Math.ceil(minBody / unit) * unit;
};

export const createFunctionAnchors = (
  shape: Polygon,
  input: Schema.Schema<any> = VoidInput,
  output: Schema.Schema<any> = VoidOutput,
) => {
  // TODO(burdon): Set type.
  const inputs = SchemaAST.getPropertySignatures(input.ast).map(({ name }) => createAnchorId('input', name.toString()));
  const outputs = SchemaAST.getPropertySignatures(output.ast).map(({ name }) =>
    createAnchorId('output', name.toString()),
  );
  return createAnchors({ shape, inputs, outputs, center: { x: 0, y: (headerHeight - footerHeight) / 2 + 1 } });
};
