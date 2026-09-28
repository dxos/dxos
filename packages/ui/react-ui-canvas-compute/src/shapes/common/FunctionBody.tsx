//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { type JSX, useRef, useState } from 'react';

import { VoidInput, VoidOutput } from '@dxos/conductor';
import { getParentShapeElement, rowHeight } from '@dxos/react-ui-canvas-editor';

import { useComputeContext } from '../../hooks/compute-context.ts';
import { Box, type BoxProps } from '../common/index.ts';
import { type ComputeShape, getProperties } from '../defs.ts';
import { bodyPadding } from './function-anchors.ts';

const expandedHeight = 200;

export type FunctionBodyProps = {
  shape: ComputeShape;
  name?: string;
  content?: JSX.Element;
  inputSchema?: Schema.Top;
  outputSchema?: Schema.Top;
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
  // Opening grows the shape: through the host's `resize` when it offers one (the scene engine, where size
  // is model state), else by stretching the editor's frame element as the canvas editor always did.
  const { resize } = useComputeContext();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const handleAction: BoxProps['onAction'] = (action) => {
    const opening = action === 'open';
    if (resize) {
      resize(shape.id, opening ? expandedHeight : -expandedHeight);
    } else if (rootRef.current) {
      const element = getParentShapeElement(rootRef.current, shape.id);
      if (element) {
        // The layout height is already in canvas units, whatever the zoom.
        element.style.height = opening ? `${element.offsetHeight + expandedHeight}px` : '';
      }
    }
    setOpen(opening);
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
      classNames='divide-y divide-subdued-separator'
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
              <div key={name} className='px-2 truncate text-sm font-mono items-center' style={{ height: rowHeight }}>
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
                className='px-2 truncate text-sm font-mono items-center text-right'
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
