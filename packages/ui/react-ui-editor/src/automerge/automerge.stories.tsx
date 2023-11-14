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
  const handleRef = useRef<EchoObject>()
  const [,forceUpdate] = useState({})

  useEffect(() => {
    const handle = new EchoObject()
    handle.doc = automerge.from({ text: 'Hello world!'})

    handleRef.current = handle
    window.handle = handleRef.current
    forceUpdate({})
  }, [])

  if(!handleRef.current) {
    return null;
  }

  return (
    <Editor handle={handleRef.current} path={['text']} />
  )
}

export default {
  title: 'Automerge',
};


export const EditorStory = {
  render: () => <Story />
};
