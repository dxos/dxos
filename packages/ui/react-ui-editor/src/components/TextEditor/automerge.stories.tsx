//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { EditorView } from '@codemirror/view';
import '@preact/signals-react'; // Register react integration
import { basicSetup } from 'codemirror';
import get from 'lodash.get';
import React, { useEffect, useRef, useState } from 'react';

import { type Prop } from '@dxos/automerge/automerge';
import { Repo, type DocHandle } from '@dxos/automerge/automerge-repo';
import { Filter, setGlobalAutomergePreference } from '@dxos/echo-schema';
import { type PublicKey } from '@dxos/keys';
import { Expando, TextObject, useSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { ClientRepeater } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { MarkdownEditor } from './TextEditor';
import { type IDocHandle, automerge, awareness } from '../../extensions';
import { useTextModel } from '../../hooks';

// TODO(burdon): Move to components.

type EditorProps = {
  handle: IDocHandle;
  path: Prop[];
};

const Editor = ({ handle, path }: EditorProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRoot = useRef<EditorView>();

  useEffect(() => {
    const view = (editorRoot.current = new EditorView({
      doc: get(handle.docSync()!, path),
      extensions: [basicSetup, automerge({ handle, path }), awareness()],
      parent: containerRef.current as any,
    }));

    return () => {
      view.destroy();
    };
  }, []);

  return <div className='codemirror-editor' ref={containerRef} onKeyDown={(evt) => evt.stopPropagation()} />;
};

const Story = () => {
  const [object1, setObject1] = useState<DocHandle<any> | null>(null);
  const [object2, setObject2] = useState<DocHandle<any> | null>(null);

  useEffect(() => {
    queueMicrotask(async () => {
      const repo1 = new Repo({
        network: [new BroadcastChannelNetworkAdapter()],
      });
      const repo2 = new Repo({
        network: [new BroadcastChannelNetworkAdapter()],
      });

      const object1 = repo1.create();
      object1.change((doc: any) => {
        doc.text = 'Hello world!';
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100vw' }}>
      <div>
        <Editor handle={object1} path={['text']} />
      </div>
      <div>
        <Editor handle={object2} path={['text']} />
      </div>
    </div>
  );
};

export default {
  title: 'react-ui-editor/Automerge',
  component: Editor,
  render: () => <Story />,
};

export const Default = {};

const EchoStory = ({ id, spaceKey }: { id: number; spaceKey: PublicKey }) => {
  const identity = useIdentity();
  const space = useSpace(spaceKey);
  // TODO(dmaretskyi): useQuery doesn't work.
  const [obj] = space?.db.query(Filter.from({ type: 'test' })).objects ?? [];

  const model = useTextModel({
    text: obj?.content,
    identity,
    space,
  });

  if (!model) {
    return null;
  }

  return (
    // <div className={mx(fixedInsetFlexLayout, groupSurface)}>
    <div className='flex justify-center overflow-y-scroll'>
      <div className='flex flex-col w-[800px] py-16'>
        <MarkdownEditor model={model} />
        <div className='flex shrink-0 h-[300px]'></div>
      </div>
    </div>
    // </div>
  );
};

export const WithEcho = {
  render: () => {
    setGlobalAutomergePreference(true);
    return (
      <ClientRepeater
        count={2}
        createSpace
        onCreateSpace={async (space) => {
          space.db.add(
            new Expando({
              type: 'test',
              content: new TextObject('Hello world!'),
            }),
          );
        }}
        Component={EchoStory}
      />
    );
  },
  decorators: [withTheme],
};
