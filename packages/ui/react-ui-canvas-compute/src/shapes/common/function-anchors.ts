//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { VoidInput, VoidOutput } from '@dxos/conductor';
import { SchemaAST } from '@dxos/effect';
import { type Polygon } from '@dxos/react-ui-canvas-editor';
import { createAnchors, rowHeight } from '@dxos/react-ui-canvas-editor';

import { footerHeight, headerHeight } from '../common/index.ts';
import { createAnchorId } from '../defs.ts';

// Kept out of `FunctionBody.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/** Vertical padding inside the function body; the height maths below depends on it. */
export const bodyPadding = 8;

export const getHeight = (input: Schema.Schema<any>) => {
  const properties = SchemaAST.getPropertySignatures(input.ast);
  return headerHeight + footerHeight + bodyPadding * 2 + properties.length * rowHeight + 2; // Incl. borders.
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
