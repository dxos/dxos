//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';

import { VoidInput, VoidOutput } from '@dxos/conductor';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import { DEFAULT_GRID, type Point, type Port, type Size } from '@dxos/react-ui-canvas/scene';

import { createAnchorId, parseAnchorId } from '../defs.ts';
import { footerHeight, headerHeight } from './box-defs.ts';

// Kept out of `FunctionBody.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/**
 * Height of one property row, two minor grid cells: with the rows centred in a body that is a whole number of rows,
 * every row's centre, and so every port, lands on a minor grid line.
 */
export const rowHeight = 2 * DEFAULT_GRID;

/** A function shape's height: the chrome plus one row per input (at least one), each a whole number of rows. */
export const getHeight = (input: Schema.Schema<any>) => {
  const properties = SchemaAST.getPropertySignatures(input.ast);
  return headerHeight + footerHeight + Math.max(properties.length, 1) * rowHeight;
};

/** `n` points one row apart, centred on `center`. */
export const getRowPoints = (center: Point, n: number): Point[] => {
  const span = (n - 1) * rowHeight;
  return [...Array(n)].map((_, index) => ({ x: center.x, y: center.y - span / 2 + index * rowHeight }));
};

/** A port at a point relative to the node's centre, in px. */
export type PortPoint = { id: string; pos: Point };

/**
 * The ports at the given points: each sits on whichever edge it is nearer to, at its offset along it; the
 * id's `input.` / `output.` prefix says which way a link may run.
 */
export const pointsToPorts = (points: readonly PortPoint[], size: Size): Port[] =>
  points.map(({ id, pos }) => {
    const [kind] = parseAnchorId(id);
    const half = { x: size.width / 2, y: size.height / 2 };
    // Ties go to the vertical edges (the input / output sides).
    const vertical = Math.abs(Math.abs(pos.x) - half.x) <= Math.abs(Math.abs(pos.y) - half.y);
    const side = vertical ? (pos.x < 0 ? 'w' : 'e') : pos.y < 0 ? 'n' : 's';
    const along = vertical ? (pos.y + half.y) / size.height : (pos.x + half.x) / size.width;
    return {
      id,
      side,
      offset: Math.min(Math.max(along, 0), 1),
      ...(kind === 'input' ? { accepts: 'in' as const } : kind === 'output' ? { accepts: 'out' as const } : {}),
    };
  });

/** Ports at points given in half-sizes from the centre (`{ x: 1, y: 0 }` is the middle of the east side). */
export const createPorts = (size: Size, points: Record<string, Point>): Port[] =>
  pointsToPorts(
    Object.entries(points).map(([id, { x, y }]) => ({
      id,
      pos: { x: (x * size.width) / 2, y: (y * size.height) / 2 },
    })),
    size,
  );

/** Inputs stacked one row apart down the west side and outputs down the east, centred on `center`. */
export const createRowPorts = ({
  size,
  inputs,
  outputs,
  center = { x: 0, y: 0 },
}: {
  size: Size;
  inputs: readonly string[];
  outputs: readonly string[];
  center?: Point;
}): Port[] =>
  pointsToPorts(
    [
      ...getRowPoints({ x: center.x - size.width / 2, y: center.y }, inputs.length).map((pos, index) => ({
        id: inputs[index],
        pos,
      })),
      ...getRowPoints({ x: center.x + size.width / 2, y: center.y }, outputs.length).map((pos, index) => ({
        id: outputs[index],
        pos,
      })),
    ],
    size,
  );

/** A function shape's ports: one per property of its input and output schemas, level with the body's rows. */
export const createFunctionPorts = (
  size: Size,
  input: Schema.Schema<any> = VoidInput,
  output: Schema.Schema<any> = VoidOutput,
): Port[] => {
  // TODO(burdon): Set type.
  const inputs = SchemaAST.getPropertySignatures(input.ast).map(({ name }) => createAnchorId('input', name.toString()));
  const outputs = SchemaAST.getPropertySignatures(output.ast).map(({ name }) =>
    createAnchorId('output', name.toString()),
  );
  // The rows are centred in the body, between the header and the footer.
  return createRowPorts({ size, inputs, outputs, center: { x: 0, y: (headerHeight - footerHeight) / 2 } });
};
