//
// Copyright 2024 DXOS.org
//

import React, { type JSX, useRef, useState } from 'react';

import { AST, S } from '@dxos/echo-schema';
import { useProjection } from '@dxos/react-ui-canvas';

import { Box, type BoxProps, footerHeight, headerHeight } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps, getProperties } from './defs';
import { getParentShapeElement, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchors, rowHeight } from '../../components';
import { type Polygon, type Shape } from '../../types';
import { DefaultInput, VoidInput, VoidOutput } from '../graph';

const expandedHeight = 200;

export const FunctionShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('function'),
  }),
);

export type FunctionShape = S.Schema.Type<typeof FunctionShape>;

export type CreateFunctionProps = CreateShapeProps<FunctionShape>;

export const createFunction = ({ id, ...rest }: CreateFunctionProps): FunctionShape => {
  return {
    id,
    type: 'function',
    size: { width: 192, height: getHeight(DefaultInput) },
    ...rest,
  };
};

export const FunctionComponent = ({ shape }: ShapeComponentProps<FunctionShape>) => {
  return null;
  // return (
  // <FunctionBody shape={shape} name={shape.node.name} inputSchema={shape.node.inputSchema} outputSchema={shape.node.outputSchema} />
  // )
};

export const functionShape: ShapeDef<FunctionShape> = {
  type: 'function',
  icon: 'ph--function--regular',
  component: FunctionComponent,
  createShape: createFunction,
  // getAnchors: (shape) => createFunctionAnchors(shape, shape.node.inputSchema, shape.node.outputSchema),
};

//
// Common function components.
//

const bodyPadding = 8;

export type FunctionBodyProps = {
  shape: Shape;
  name: string;
  content?: JSX.Element;
  inputSchema?: S.Schema.Any;
  outputSchema?: S.Schema.Any;
} & Pick<BoxProps, 'status' | 'resizable'>;

export const FunctionBody = ({
  shape,
  name,
  content,
  inputSchema = VoidInput,
  outputSchema = VoidOutput,
  ...props
}: FunctionBodyProps) => {
  const { scale } = useProjection();
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

  return (
    <Box
      ref={rootRef}
      classNames='divide-y divide-separator'
      name={name}
      open={open}
      resizable
      onAction={handleAction}
      {...props}
    >
      <div className='grid grid-cols-2 items-center' style={{ paddingTop: bodyPadding, paddingBottom: bodyPadding }}>
        <div className='flex flex-col'>
          {inputs?.map(({ name }) => (
            <div key={name} className='px-2 truncate text-sm font-mono items-center' style={{ height: rowHeight }}>
              {name}
            </div>
          ))}
        </div>
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
      </div>
      {open && <div className='flex flex-col grow overflow-hidden'>{content}</div>}
    </Box>
  );
};

export const getHeight = (input: S.Schema<any>) => {
  const properties = AST.getPropertySignatures(input.ast);
  return headerHeight + footerHeight + bodyPadding * 2 + properties.length * rowHeight + 2; // Incl. borders.
};

export const createFunctionAnchors = (
  shape: Polygon,
  input: S.Schema<any> = VoidInput,
  output: S.Schema<any> = VoidOutput,
) => {
  const inputs = AST.getPropertySignatures(input.ast).map(({ name }) => createAnchorId('input', name.toString()));
  const outputs = AST.getPropertySignatures(output.ast).map(({ name }) => createAnchorId('output', name.toString()));
  return createAnchors({ shape, inputs, outputs, center: { x: 0, y: (headerHeight - footerHeight) / 2 + 1 } });
};
