//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import '@preact/signals-react';
import React, { useEffect, useState } from 'react';

import { TextType } from '@braneframe/types';
import { Repo } from '@dxos/automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@dxos/automerge/automerge-repo-network-broadcastchannel';
import { create, type Expando } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { Filter, DocAccessor, createDocAccessor, useSpace } from '@dxos/react-client/echo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { automerge } from './automerge';
import { useTextEditor } from '../../hooks';
import translations from '../../translations';
import { createBasicExtensions, createThemeExtensions } from '../factories';

const initialContent = 'Hello world!';

type TestObject = {
  text: string;
};

type EditorProps = {
  source: DocAccessor;
  autoFocus?: boolean;
};

const Editor = ({ source, autoFocus }: EditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      doc: DocAccessor.getValue(source),
      extensions: [
        createBasicExtensions({ placeholder: 'Type here...' }),
        createThemeExtensions({ themeMode, slots: { editor: { className: 'w-full p-2 bg-white dark:bg-black' } } }),
        automerge(source),
      ],
      autoFocus,
    }),
    [source, themeMode],
  );

  return <div ref={parentRef} className='flex w-full' />;
};

const Story = () => {
  const [object1, setObject1] = useState<DocAccessor<TestObject>>();
  const [object2, setObject2] = useState<DocAccessor<TestObject>>();

  useEffect(() => {
    queueMicrotask(async () => {
      const repo1 = new Repo({ network: [new BroadcastChannelNetworkAdapter()] });
      const repo2 = new Repo({ network: [new BroadcastChannelNetworkAdapter()] });

      const object1 = repo1.create();
      object1.change((doc: TestObject) => {
        doc.text = initialContent;
      });

      const object2 = repo2.find(object1.url);
      await object2.whenReady();

      setObject1({ handle: object1, path: ['text'] });
      setObject2({ handle: object2, path: ['text'] });
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

export default {
  title: 'react-ui-editor/Automerge',
  component: Editor,
  decorators: [withTheme],
  render: () => <Story />,
  parameters: { translations, layout: 'fullscreen' },
};

const EchoStory = ({ spaceKey }: { spaceKey: PublicKey }) => {
  const space = useSpace(spaceKey);
  const [source, setSource] = useState<DocAccessor>();
  useEffect(() => {
    setTimeout(async () => {
      if (space) {
        const { objects = [] } = await space.db.query<Expando>(Filter.from({ type: 'test' })).run();
        if (objects.length) {
          const source = createDocAccessor(objects[0].content, ['content']);
          setSource(source);
        }
      }
    });
  }, [space]);

  if (!source) {
    return null;
  }

  return <Editor source={source} />;
};

export const Default = {};

export const WithEcho = {
  decorators: [withTheme],
  render: () => {
    return (
      <ClientRepeater
        count={2}
        component={EchoStory}
        createSpace
        onCreateSpace={async (space) => {
          space.db.add(
            create({
              type: 'test',
              content: create(TextType, { content: initialContent }),
            }),
          );
        }}
      />
    );
  },
};
