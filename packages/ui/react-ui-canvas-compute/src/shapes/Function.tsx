//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import { Filter, Ref } from '@dxos/echo';
import { instanceOf as isInstanceOf } from '@dxos/echo/Obj';
import { parseId } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import {
  type ShapeComponentProps,
  TextBox,
  type TextBoxControl,
  type TextBoxProps,
} from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks/index.ts';
import { Box } from './common/index.ts';
import { type FunctionShape } from './function-def.ts';

//
// Component
//

type FunctionShapeComponentProps = ShapeComponentProps<FunctionShape> & TextBoxProps & { title?: string };

export const FunctionShapeComponent = ({ shape, title, ...props }: FunctionShapeComponentProps) => {
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
      const object = space?.db.query(Filter.id(objectId)).runSync()[0];
      if (!space || !isInstanceOf(Script.Script, object)) {
        return;
      }

      const [fn] = await space.db.query(Filter.type(Operation.PersistentOperation, { source: Ref.make(object) })).run();
      if (!fn) {
        return;
      }

      node.value = value;
      node.function = Ref.make(fn);
      node.inputSchema = fn.inputSchema;
      node.outputSchema = fn.outputSchema;
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
