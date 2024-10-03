//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useRef, useState } from 'react';

import { FunctionType } from '@dxos/plugin-script/types';
import { create, useSpace, Filter } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Toolbar, Button, Input } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withTheme } from '@dxos/storybook-utils';

import { testPlugins } from './testing';
import { createSheet } from '../defs';
import { useComputeGraph, useSheetModel } from '../hooks';
import { withComputeGraphDecorator } from '../testing';
import { SheetType } from '../types';

const FUNCTION_NAME = 'TEST';

const Story = () => {
  const space = useSpace();
  const graph = useComputeGraph(space);
  const [sheet, setSheet] = useState<SheetType>();
  const [text, setText] = useState(`${FUNCTION_NAME}(100)`);
  const [result, setResult] = useState<any>();
  const model = useSheetModel(graph, sheet);
  useEffect(() => {
    if (space) {
      const sheet = space.db.add(createSheet());
      setSheet(sheet);
    }
  }, [space]);

  useEffect(() => {
    if (space && graph) {
      graph.update.on(() => {
        const f1 = graph.getFunctions({ standard: true, echo: false });
        const f2 = graph.getFunctions({ standard: false, echo: true });
        setResult({ functions: { standard: f1.length, echo: f2.length } });
      });

      space.db.add(create(FunctionType, { version: 1, binding: FUNCTION_NAME }));
    }
  }, [space, graph]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const handleTest = async () => {
    if (space && graph) {
      const { objects } = await space.db.query(Filter.schema(FunctionType)).run();
      const mapped = graph.mapFunctionBindingToId(text);
      const unmapped = graph.mapFunctionBindingFromId(mapped);
      const internal = graph.mapFormulaToNative(text);
      setResult({ mapped, unmapped, internal, functions: objects.map((object) => object.id) });
    }

    inputRef.current?.focus();
  };

  return (
    <div className='flex flex-col gap-2 '>
      <Toolbar.Root>
        <Input.Root>
          <Input.TextInput
            ref={inputRef}
            placeholder='Formula'
            value={text}
            onChange={(ev) => setText(ev.target.value)}
          />
        </Input.Root>
        <Button onClick={handleTest}>Test</Button>
      </Toolbar.Root>
      <SyntaxHighlighter language='json'>
        {JSON.stringify({ space: space?.id, graph: graph?.id, sheet: sheet?.id, model: model?.id, result }, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
};

export default {
  title: 'plugin-sheet/functions',
  decorators: [
    withClientProvider({ types: [FunctionType, SheetType], createIdentity: true, createSpace: true }),
    withComputeGraphDecorator({ plugins: testPlugins }),
    withTheme,
  ],
  render: (args: any) => <Story {...args} />,
};

export const Default = {};
