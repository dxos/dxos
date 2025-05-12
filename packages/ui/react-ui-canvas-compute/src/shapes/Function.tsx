//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { AnyOutput, FunctionInput } from '@dxos/conductor';
import { getSnapshot, isInstanceOf, S } from '@dxos/echo-schema';
import { FunctionType, ScriptType } from '@dxos/functions';
import { useClient } from '@dxos/react-client';
import { Filter, makeRef, parseId } from '@dxos/react-client/echo';
import {
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
  type ShapeComponentProps,
  type ShapeDef,
} from '@dxos/react-ui-canvas-editor';

import { Box, createFunctionAnchors } from './common';
import { ComputeShape, createShape, type CreateShapeProps } from './defs';
import { useComputeNodeState } from '../hooks';

export const FunctionShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('function'),
  }),
);

export type FunctionShape = S.Schema.Type<typeof FunctionShape>;

export type CreateFunctionProps = CreateShapeProps<FunctionShape>;

export const createFunction = (props: CreateFunctionProps) =>
  createShape<FunctionShape>({ type: 'function', size: { width: 256, height: 192 }, ...props });

//
// Component
//

type TextInputComponentProps = ShapeComponentProps<FunctionShape> & TextBoxProps & { title?: string };

const TextInputComponent = ({ shape, title, ...props }: TextInputComponentProps) => {
  const client = useClient();
  const { node, runtime } = useComputeNodeState(shape);
  const inputRef = useRef<TextBoxControl>(null);

  const handleEnter = useCallback(
    async (text: string) => {
      const value = text.trim();
      const { spaceId, objectId } = parseId(value);
      if (!spaceId || !objectId) {
        return;
      }

      const space = client.spaces.get(spaceId);
      const object = space?.db.getObjectById(objectId);
      if (!space || !isInstanceOf(ScriptType, object)) {
        return;
      }

      const {
        objects: [fn],
      } = await space.db.query(Filter.schema(FunctionType, { source: object })).run();
      if (!fn) {
        return;
      }

      node.value = value;
      node.function = makeRef(fn);
      node.inputSchema = getSnapshot(fn.inputSchema);
      node.outputSchema = getSnapshot(fn.outputSchema);
    },
    [client, node],
  );

  const handleAction = useCallback(
    (action: 'run' | 'open' | 'close') => {
      if (action !== 'run') {
        return;
      }

      runtime.evalNode();
    },
    [runtime],
  );

  return (
    <Box shape={shape} title='Function' onAction={handleAction}>
      <TextBox
        {...props}
        ref={inputRef}
        value={node.value}
        language={node.valueType === 'object' ? 'json' : undefined}
        onBlur={handleEnter}
        onEnter={handleEnter}
      />
    </Box>
  );
};

//
// Defs
//

export const functionShape: ShapeDef<FunctionShape> = {
  type: 'function',
  name: 'Function',
  icon: 'ph--function--regular',
  component: TextInputComponent,
  createShape: createFunction,
  getAnchors: (shape) => createFunctionAnchors(shape, FunctionInput, AnyOutput),
};
