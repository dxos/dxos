//
// Copyright 2023 DXOS.org
//

import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import React, { useEffect, useRef, useState } from 'react';
import '@preact/signals-react'; // Register react integration

import { type Prop, next as automerge } from '@dxos/automerge/automerge';

import { plugin as amgPlugin } from './automerge-plugin';
import { Peer } from './demo';

type EditorProps = {
  handle: Peer;
  path: Prop[];
};

const Editor = ({ handle, path }: EditorProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRoot = useRef<EditorView>();

  useEffect(() => {
    const doc = handle.doc;
    const source = doc.text; // this should use path

    const plugin = amgPlugin(doc, path);

    const view = (editorRoot.current = new EditorView({
      doc: source,
      extensions: [basicSetup, plugin],
      dispatch: (transaction) => {
        view.update([transaction]);
        plugin.reconcile(handle, view);
      },
      parent: containerRef.current as any,
    }));

    const handleChange = () => {
      plugin.reconcile(handle, view);
    };

    handle.changeEvent.on(handleChange);

    return () => {
      handle.changeEvent.off(handleChange);
      view.destroy();
    };
  }, []);

  return <div className='codemirror-editor' ref={containerRef} onKeyDown={(evt) => evt.stopPropagation()} />;
};

const Story = () => {
  const [object1, setObject1] = useState<Peer | null>(null);
  const [object2, setObject2] = useState<Peer | null>(null);
  const [stats1, setStats1] = useState<any>({});
  const [stats2, setStats2] = useState<any>({});

  useEffect(() => {
    const object1 = new Peer();
    object1.doc = automerge.from({ text: 'Hello world!' });

    const object2 = new Peer();
    object2.doc = automerge.init();

    const r1 = object1.replicate();
    const r2 = object2.replicate();

    void r1.readable.pipeTo(r2.writable);
    void r2.readable.pipeTo(r1.writable);

    setObject1(object1);
    setObject2(object2);

    setInterval(() => {
      setStats1({ ...object1.stats });
      setStats2({ ...object2.stats });
    }, 500);
  }, []);

  if (!object1 || !object2) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100vw' }}>
      <div>
        <Editor handle={object1} path={['text']} />
        <div style={{ whiteSpace: 'pre' }}>{JSON.stringify(stats1, null, 2)}</div>
      </div>
      <div>
        <Editor handle={object2} path={['text']} />
        <div style={{ whiteSpace: 'pre' }}>{JSON.stringify(stats2, null, 2)}</div>
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
