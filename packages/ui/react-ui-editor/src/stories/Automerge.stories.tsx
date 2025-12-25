//
// Copyright 2023 DXOS.org
//

import '@preact/signals-react';

import { Repo } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { Obj, Ref, Type } from '@dxos/echo';
import { DocAccessor, createDocAccessor } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { type Messenger } from '@dxos/protocols';
import { Query, useQuery, useSpace } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { useClientStory, withMultiClientProvider } from '@dxos/react-client/testing';
import { Button, useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { render } from '@dxos/storybook-utils';
import { createBasicExtensions, createDataExtensions, createThemeExtensions } from '@dxos/ui-editor';

import { useTextEditor } from '../hooks';
import { translations } from '../translations';

const initialContent = 'Hello world!';

type TestObject = {
  text: string;
};

type EditorProps = {
  source: DocAccessor;
  messenger?: Messenger;
  identity?: Identity;
  autoFocus?: boolean;
};

const Editor = ({ source, messenger, identity, autoFocus }: EditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      autoFocus,
      initialValue: DocAccessor.getValue(source),
      extensions: [
        createBasicExtensions({ placeholder: 'Type here...', search: true }),
        createThemeExtensions({ themeMode }),
        createDataExtensions({ id: 'test', text: source, messenger, identity }),
      ],
    }),
    [source, themeMode],
  );

  return <div ref={parentRef} className='flex is-full p-2' />;
};

const DefaultStory = () => {
  const [object1, setObject1] = useState<DocAccessor<TestObject>>();
  const [object2, setObject2] = useState<DocAccessor<TestObject>>();

  useEffect(() => {
    queueMicrotask(async () => {
      const repo1 = new Repo({ network: [new BroadcastChannelNetworkAdapter()] });
      const repo2 = new Repo({ network: [new BroadcastChannelNetworkAdapter()] });

      const object1 = repo1.create<TestObject>();
      object1.change((doc: TestObject) => {
        doc.text = initialContent;
      });

      const object2 = await repo2.find<TestObject>(object1.url);
      await object2.whenReady();

      setObject1({ handle: object1, path: ['text'] });
      setObject2({ handle: object2, path: ['text'] });
    });
  }, []);

  if (!object1 || !object2) {
    return null;
  }

  return (
    <div className='grid grid-cols-2 bs-full is-full divide-x divide-separator'>
      <Editor source={object1} autoFocus />
      <Editor source={object2} />
    </div>
  );
};

const EchoStory = () => {
  const { spaceId, index } = useClientStory();
  const identity = useIdentity();
  const space = useSpace(spaceId);
  const objects = useQuery(space?.db, Query.type(Type.Expando, { type: 'test' }));

  const [source, setSource] = useState<DocAccessor>();
  const init = useCallback(() => {
    const content = objects[0]?.content.target;
    if (!content) {
      if (objects.length) {
        // TODO(burdon): Initially ref isn't ready.
        log.warn('no content', { index, objects: JSON.stringify(objects) });
      }
      return;
    }

    setSource(createDocAccessor(content, ['content']));
  }, [objects]);
  useEffect(() => {
    if (source) {
      return;
    }

    init();
  }, [objects, source]);

  return (
    <div className='flex flex-col h-full grow overflow-hidden'>
      <pre className='p-2 text-xs text-subdued'>
        {JSON.stringify({ index, identity: identity?.identityKey.truncate(), spaceId, objects }, null, 2)}
      </pre>
      {identity && source ? (
        <div className='flex grow overflow-hidden'>
          <Editor identity={identity} messenger={space} source={source} />
        </div>
      ) : (
        <div className='p-2'>
          <Button onClick={init}>Init</Button>
        </div>
      )}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-editor/Automerge',
  component: Editor as any,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(burdon): ERROR: factories.ts:126 Error: Non-base58 character
export const Default: Story = {
  decorators: [withTheme],
  render: render(DefaultStory),
};

// TODO(burdon): Failing (doesn't sync)
export const WithEcho: Story = {
  decorators: [
    withTheme,
    withMultiClientProvider({
      numClients: 2,
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        space.db.add(
          Obj.make(Type.Expando, {
            type: 'test',
            content: Ref.make(Obj.make(Type.Expando, { content: initialContent })),
          }),
        );
      },
    }),
  ],
  render: render(EchoStory),
};
