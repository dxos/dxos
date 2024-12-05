//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import '@preact/signals-react';
import React, { useEffect, useState } from 'react';

import { Repo } from '@dxos/automerge/automerge-repo';
import { BroadcastChannelNetworkAdapter } from '@dxos/automerge/automerge-repo-network-broadcastchannel';
import { Expando } from '@dxos/echo-schema';
import {
  DocAccessor,
  Filter,
  create,
  createDocAccessor,
  useQuery,
  useSpace,
  type Space,
} from '@dxos/react-client/echo';
import { useIdentity, type Identity } from '@dxos/react-client/halo';
import { ClientRepeater, type ClientRepeatedComponentProps } from '@dxos/react-client/testing';
import { useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { editorContent } from '../../defaults';
import { useTextEditor } from '../../hooks';
import translations from '../../translations';
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
        createBasicExtensions({ placeholder: 'Type here...' }),
        createThemeExtensions({
          themeMode,
          slots: {
            editor: { className: editorContent },
          },
        }),
        createDataExtensions({ id: 'test', text: source, space, identity }),
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
  title: 'ui/react-ui-editor/Automerge',
  component: Editor,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  render: () => <Story />,
  parameters: { translations },
};

const EchoStory = ({ spaceKey }: ClientRepeatedComponentProps) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  const [source, setSource] = useState<DocAccessor>();
  const objects = useQuery<Expando>(space, Filter.from({ type: 'test' }));

  useEffect(() => {
    if (!source && objects.length) {
      const source = createDocAccessor(objects[0].content, ['content']);
      setSource(source);
    }
  }, [objects, source]);

  if (!source) {
    return null;
  }

  return <Editor source={source} space={space} identity={identity ?? undefined} />;
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
        onSpaceCreated={async ({ space }) => {
          space.db.add(
            create({
              type: 'test',
              content: create(Expando, { content: initialContent }),
            }),
          );
        }}
      />
    );
  },
};
