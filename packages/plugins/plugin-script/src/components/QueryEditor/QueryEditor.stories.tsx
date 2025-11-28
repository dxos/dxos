//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { createDocAccessor } from '@dxos/echo-db';
import { QuerySandbox } from '@dxos/echo-query';
import { createObject } from '@dxos/react-client/echo';
import { Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { trim } from '@dxos/util';

import { QueryEditor, type QueryEditorProps } from './QueryEditor';

const SCRIPT = trim`
  Query.select(Filter.type('dxos.org/type/Person'))
`;

const DefaultStory = (props: QueryEditorProps) => {
  const object = useMemo(() => createObject({ content: SCRIPT }), []);
  const [result, setResult] = useState<object | undefined>({});
  const [sandbox, setSandbox] = useState<QuerySandbox>();

  useAsyncEffect(async () => {
    const sandbox = new QuerySandbox();
    await sandbox.open();
    setSandbox(sandbox);

    return () => {
      void sandbox.close();
    };
  }, []);

  const extensions = useMemo(
    () => [createDataExtensions({ id: object.id, text: createDocAccessor(object, ['content']) })],
    [],
  );

  const handleRun = useCallback(async () => {
    try {
      const result = sandbox?.eval(object.content);

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
  }, [object, sandbox]);

  return (
    <StackItem.Content toolbar>
      {/* <ScriptToolbar script={script} state={{}} /> */}
      <Toolbar.Root>
        <Toolbar.Button onClick={handleRun}>Run</Toolbar.Button>
      </Toolbar.Root>
      <div role='none' className='grid grid-rows-[1fr_min-content] bs-full overflow-hidden text-sm'>
        <QueryEditor {...props} initialValue={object.content} extensions={extensions} />
        <Json data={result} classNames='shrink-0 p-2 border-t border-subduedSeparator' />
      </div>
    </StackItem.Content>
  );
};

const meta = {
  title: 'plugins/plugin-script/QueryEditor',
  component: QueryEditor,
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
