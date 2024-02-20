//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import '@preact/signals-react';
import { EditorView } from '@codemirror/view'; // Register react integration.
import get from 'lodash.get';
import React, { useEffect, useMemo, useState } from 'react';

import { type Prop } from '@dxos/automerge/automerge';
import { Repo, type DocHandle } from '@dxos/automerge/automerge-repo';
import { Filter } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { Expando, TextObject, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor } from './TextEditor';
import { type IDocHandle, automerge, awareness, createBasicBundle } from '../../extensions';
import { useTextEditor, useTextModel } from '../../hooks';
import { defaultTheme } from '../../themes';
import translations from '../../translations';

const initialContent = 'Hello world!';

type TestObject = {
  text: string;
};

type EditorProps = {
  handle: IDocHandle;
  path?: Prop[];
};

const Editor = ({ handle, path = ['text'] }: EditorProps) => {
  const extensions = useMemo(
    () => [
      EditorView.baseTheme(defaultTheme),
      EditorView.editorAttributes.of({ class: 'p-2 bg-white' }),
      createBasicBundle({ placeholder: 'Type here...' }),
      automerge({ handle, path }),
      awareness(),
    ],
    [handle, path],
  );
  const { parentRef } = useTextEditor({
    autoFocus: true,
    doc: get(handle.docSync()!, path),
    extensions,
  });

  return <div ref={parentRef} />;
};

const Story = () => {
  const [object1, setObject1] = useState<DocHandle<TestObject>>();
  const [object2, setObject2] = useState<DocHandle<TestObject>>();

  useEffect(() => {
    queueMicrotask(async () => {
      const repo1 = new Repo({
        network: [new BroadcastChannelNetworkAdapter()],
      });
      const repo2 = new Repo({
        network: [new BroadcastChannelNetworkAdapter()],
      });

      const object1 = repo1.create();
      object1.change((doc: TestObject) => {
        doc.text = initialContent;
      });

      const object2 = repo2.find(object1.url);
      await object2.whenReady();

      setObject1(object1);
      setObject2(object2);
    });
  }, []);

  if (!object1 || !object2) {
    return null;
  }

  return (
    <div role='none' className='grid grid-cols-2 bs-full is-full gap-2'>
      <Editor handle={object1} path={['text']} />
      <Editor handle={object2} path={['text']} />
    </div>
  );
};

export default {
  title: 'react-ui-editor/Automerge',
  component: Editor,
  render: () => <Story />,
  parameters: { translations, layout: 'fullscreen' },
};

export const Default = {};

const EchoStory = ({ spaceKey }: { spaceKey: PublicKey }) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  // TODO(dmaretskyi): useQuery doesn't work.
  const [obj] = space?.db.query(Filter.from({ type: 'test' })).objects ?? [];
  const model = useTextModel({
    identity,
    space,
    text: obj?.content,
  });

  if (!model) {
    return null;
  }

  return <MarkdownEditor model={model} />;
};

export const WithEcho = {
  decorators: [withTheme],
  render: () => {
    return (
      <ClientRepeater
        count={2}
        createSpace
        onCreateSpace={async (space) => {
          space.db.add(
            new Expando({
              type: 'test',
              content: new TextObject(initialContent),
            }),
          );
        }}
        component={EchoStory}
      />
    );
  },
};
