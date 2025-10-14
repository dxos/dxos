//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useRef } from 'react';

import { AnyOutput, FunctionInput } from '@dxos/conductor';
import { Ref, getSnapshot, isInstanceOf } from '@dxos/echo-schema';
import { FunctionType, ScriptType } from '@dxos/functions';
import { useClient } from '@dxos/react-client';
import { Filter, parseId } from '@dxos/react-client/echo';
import {
  type ShapeComponentProps,
  type ShapeDef,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks';

import { Box, createFunctionAnchors } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

export const FunctionShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('function'),
  }),
);

export type FunctionShape = Schema.Schema.Type<typeof FunctionShape>;

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
      } = await space.db.query(Filter.type(FunctionType, { source: Ref.make(object) })).run();
      if (!fn) {
        return;
      }

      node.value = value;
      node.function = Ref.make(fn);
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
