//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { type JSX, useRef, useState } from 'react';

import { VoidInput, VoidOutput } from '@dxos/conductor';
import { useCanvasContext } from '@dxos/react-ui-canvas';
import { type Polygon, type Shape } from '@dxos/react-ui-canvas-editor';
import { createAnchors, getParentShapeElement, rowHeight } from '@dxos/react-ui-canvas-editor';

import { Box, type BoxProps, footerHeight, headerHeight } from '../common';
import { createAnchorId, getProperties } from '../defs';

const bodyPadding = 8;
const expandedHeight = 200;

export type FunctionBodyProps = {
  shape: Shape;
  name?: string;
  content?: JSX.Element;
  inputSchema?: Schema.Schema.Any;
  outputSchema?: Schema.Schema.Any;
} & Pick<BoxProps, 'status'>;

// TODO(wittjosiah): Rename, not used for functions.
export const FunctionBody = ({
  shape,
  name,
  content,
  inputSchema = VoidInput,
  outputSchema = VoidOutput,
  ...props
}: FunctionBodyProps) => {
  const { scale } = useCanvasContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const handleAction: BoxProps['onAction'] = (action) => {
    if (!rootRef.current) {
      return;
    }

    switch (action) {
      case 'open': {
        const el = getParentShapeElement(rootRef.current, shape.id)!;
        const { height } = el.getBoundingClientRect();
        el.style.height = `${height / scale + expandedHeight}px`;
        setOpen(true);
        break;
      }
      case 'close': {
        const el = getParentShapeElement(rootRef.current, shape.id)!;
        el.style.height = '';
        setOpen(false);
        break;
      }
    }
  };

  // TODO(burdon): Move labels to anchor?
  const inputs = getProperties(inputSchema.ast);
  const outputs = getProperties(outputSchema.ast);
  const columnCount = inputs.length && outputs.length ? 2 : 1;

  return (
    <Box
      ref={rootRef}
      shape={shape}
      title={name}
      classNames='divide-y divide-separator'
      open={open}
      onAction={handleAction}
      {...props}
    >
      <div
        className={`grid grid-cols-${columnCount} items-center`}
        style={{ paddingTop: bodyPadding, paddingBottom: bodyPadding }}
      >
        {(inputs?.length ?? 0) > 0 && (
          <div className='flex flex-col'>
            {inputs?.map(({ name }) => (
              <div key={name} className='pli-2 truncate text-sm font-mono items-center' style={{ height: rowHeight }}>
                {name}
              </div>
            ))}
          </div>
        )}
        {(outputs?.length ?? 0) > 0 && (
          <div className='flex flex-col'>
            {outputs?.map(({ name }) => (
              <div
                key={name}
                className='pli-2 truncate text-sm font-mono items-center text-right'
                style={{ height: rowHeight }}
              >
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
      {open && <div className='flex flex-col grow overflow-hidden'>{content}</div>}
    </Box>
  );
};

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
