//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { createObject } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { trim } from '@dxos/util';

import { TypescriptEditor, type TypescriptEditorProps } from './TypescriptEditor';

const SCRIPT = trim`
  x * 2
`;

const DefaultStory = (props: TypescriptEditorProps) => {
  const object = useMemo(() => createObject({ content: SCRIPT }), []);
  const [result, setResult] = useState<object | undefined>({});

  // TODO(burdon): Make this work.
  // const object = useMemo(() => Text.make(templates[1].source), []);
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

  const handleRun = useCallback(async () => {
    try {
      const definitions: [string, any][] = [['x', 100]];

      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const result = new Function(...definitions.map(([name]) => name), `return ${object.content.trim()}`)(
        ...definitions.map(([, value]) => value),
      );

      setResult({
        timestamp: Date.now(),
        result,
      });
    } catch (err) {
      setResult({
        timestamp: Date.now(),
        error: String(err),
      });
    }
  }, [object]);

  return (
    <StackItem.Content toolbar>
      {/* <ScriptToolbar script={script} state={{}} /> */}
      <Toolbar.Root>
        <Toolbar.Button onClick={handleRun}>Run</Toolbar.Button>
      </Toolbar.Root>
      <div role='none' className='grid grid-rows-[1fr_min-content] bs-full overflow-hidden text-sm'>
        <TypescriptEditor {...props} initialValue={object.content} extensions={extensions} />
        <Json data={result} classNames='shrink-0 p-2 border-t border-subduedSeparator' />
      </div>
    </StackItem.Content>
  );
};

const meta = {
  title: 'plugins/plugin-script/TypescriptEditor',
  component: TypescriptEditor,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ container: 'column', classNames: 'is-prose' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    id: 'test',
  },
};
