//
// Copyright 2023 DXOS.org
//

import '@preact/signals-react'; // Register react integration
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel';
import { EditorView } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import get from 'lodash.get';
import React, { useEffect, useRef, useState } from 'react';

import { type Prop } from '@dxos/automerge/automerge';
import { type DocHandle, Repo } from '@dxos/automerge/automerge-repo';

import { type IDocHandle, automergePlugin } from './automerge-plugin';

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
      extensions: [basicSetup, automergePlugin(handle, path)],
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
  title: 'Automerge',
};

export const EditorStory = {
  render: () => <Story />,
};
