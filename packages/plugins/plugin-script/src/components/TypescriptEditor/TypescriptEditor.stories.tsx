//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { createObject } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { Json } from '@dxos/react-ui-syntax-highlighter';

import { templates } from '../../templates';

import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';

const DefaultStory = (props: TypescriptEditorProps) => {
  const object = useMemo(() => createObject({ content: templates[0].source }), []);
  const [result, setResult] = useState<object | undefined>({});

  // TODO(burdon): Make this work.
  // const object = useMemo(() => DataType.makeText(templates[1].source), []);
  // const script = useMemo(
  //   () =>
  //     Obj.make(ScriptType, {
  //       source: Ref.make(createObject({ content: templates[0].source })),
  //     }),
  //   [object],
  // );

  const extensions = useMemo(
    () => [createDataExtensions({ id: object.id, text: createDocAccessor(object, ['content']) })],
    [],
  );

  // TODO(burdon): Eval.
  const handleRun = useCallback(() => {
    console.log(object.content);
    setResult({
      timestamp: Date.now(),
    });
  }, [object]);

  return (
    <StackItem.Content toolbar classNames='overflow-hidden'>
      <Toolbar.Root>
        <Toolbar.Button onClick={handleRun}>Run</Toolbar.Button>
      </Toolbar.Root>
      {/* <ScriptToolbar script={script} state={{}} /> */}
      <div className='flex flex-col bs-full text-sm overflow-hidden'>
        <TypescriptEditor
          {...props}
          classNames='overflow-hidden'
          initialValue={object.content}
          extensions={extensions}
        />
        <Json data={result} classNames='shrink-0 p-2 border-t border-subduedSeparator' />
      </div>
    </StackItem.Content>
  );
};

const meta = {
  title: 'plugins/plugin-script/TypescriptEditor',
  component: TypescriptEditor,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: {
      type: 'column',
      className: 'is-prose',
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'test',
  },
};
