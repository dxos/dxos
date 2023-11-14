import React, { MutableRefObject, useEffect, useRef, useState } from "react"

import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { Prop } from "@automerge/automerge"
import { plugin as amgPlugin, PatchSemaphore } from "./automerge-plugin"
import { next as automerge, type Doc } from "@automerge/automerge"
import { Repo, type DocHandle, PeerId, DocumentId } from "@automerge/automerge-repo"
import { reconcile } from "./automerge-plugin/plugin"
import { EchoObject } from "./demo"

type EditorProps = {
  handle: EchoObject
  path: Prop[]
}

function Editor({ handle, path }: EditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRoot = useRef<EditorView>()

  useEffect(() => {
    const doc = handle.doc;
    const source = doc.text // this should use path
    const plugin = amgPlugin(doc, path)
    const view = (editorRoot.current = new EditorView({
      doc: source,
      extensions: [basicSetup, plugin],
      dispatch(transaction) {
        view.update([transaction])
        reconcile(handle, view)
      },
      parent: containerRef.current,
    }))
    ;window.view = view;
    window.am = automerge;

    const handleChange = () => {
      reconcile(handle, view)
    }

    handle.changeEvent.on(handleChange)

    return () => {
      handle.changeEvent.off(handleChange)
      view.destroy()
    }
  }, [])

  return (
    <div
      className="codemirror-editor"
      ref={containerRef}
      onKeyDown={evt => evt.stopPropagation()}
    />
  )
}

const Story = () => {
  const [object1, setObject1] = useState<EchoObject | null>(null)
  const [object2, setObject2] = useState<EchoObject| null>(null)

  useEffect(() => {
    const object1 = new EchoObject()
    object1.doc = automerge.from({ text: 'Hello world!'})

    const object2 = new EchoObject()
    object2.doc = automerge.init();

    const r1 = object1.replicate();
    const r2 = object2.replicate();
    
    r1.readable.pipeTo(r2.writable);
    r2.readable.pipeTo(r1.writable);

    setObject1(object1)
    setObject2(object2)
  }, [])

  if(!object1 || !object2) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100vw' }}>
      <Editor handle={object1} path={['text']} />
      <Editor handle={object2} path={['text']} />
    </div>
  )
}

export default {
  title: 'Automerge',
};


export const EditorStory = {
  render: () => <Story />
};
