//
// Copyright 2023 DXOS.org
//

import '@preact/signals-react';

import { Repo } from '@automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useState } from 'react';

import { Obj, Ref, Type } from '@dxos/echo';
import { DocAccessor, Query, type Space, createDocAccessor, useQuery, useSpace } from '@dxos/react-client/echo';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { type ClientRepeatedComponentProps, ClientRepeater } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';
import { render } from '@dxos/storybook-utils';

import { editorSlots } from '../../defaults';
import { useTextEditor } from '../../hooks';
import { translations } from '../../translations';
import { createBasicExtensions, createDataExtensions, createThemeExtensions } from '../factories';

const initialContent = 'Hello world!';

type TestObject = {
  text: string;
};

type EditorProps = {
  source: DocAccessor;
  autoFocus?: boolean;
  space?: Space;
  identity?: Identity;
};

const Editor = ({ source, autoFocus, space, identity }: EditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: DocAccessor.getValue(source),
      extensions: [
        createBasicExtensions({ placeholder: 'Type here...', search: true }),
        createThemeExtensions({ themeMode, slots: editorSlots }),
        createDataExtensions({ id: 'test', text: source, space, identity }),
      ],
      autoFocus,
    }),
    [source, themeMode],
  );

  return <div ref={parentRef} className='flex w-full' />;
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

      // TODO(mykola): Fix types.
      setObject1({ handle: object1 as any, path: ['text'] });
      setObject2({ handle: object2 as any, path: ['text'] });
    });
  }, []);

  if (!object1 || !object2) {
    return null;
  }

  return (
    <div role='none' className='grid grid-cols-2 bs-full is-full divide-x divide-neutral-500'>
      <Editor source={object1} autoFocus />
      <Editor source={object2} />
    </div>
  );
};

const EchoStory = ({ spaceKey }: ClientRepeatedComponentProps) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const [source, setSource] = useState<DocAccessor>();
  const objects = useQuery(space, Query.type(Type.Expando, { type: 'test' }));

  useEffect(() => {
    const content = objects[0]?.content.target;
    if (!source && content) {
      const source = createDocAccessor(content, ['content']);
      setSource(source);
    }
  }, [objects, source]);

  if (!source) {
    return null;
  }

  return <Editor source={source} space={space} identity={identity ?? undefined} />;
};

const meta = {
  title: 'ui/react-ui-editor/Automerge',
  component: Editor as any,
  render: render(DefaultStory),
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithEcho: Story = {
  render: () => {
    return (
      <ClientRepeater
        count={2}
        component={EchoStory}
        createSpace
        onCreateSpace={async ({ space }) => {
          space.db.add(
            Obj.make(Type.Expando, {
              type: 'test',
              content: Ref.make(Obj.make(Type.Expando, { content: initialContent })),
            }),
          );
        }}
      />
    );
  },
};
