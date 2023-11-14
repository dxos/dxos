import React, { MutableRefObject, useEffect, useRef, useState } from "react"

import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import { Prop } from "@automerge/automerge"
import { plugin as amgPlugin, PatchSemaphore } from "./automerge-plugin"
import { next as automerge, type Doc } from "@automerge/automerge"
import { Repo, type DocHandle, PeerId, DocumentId } from "@automerge/automerge-repo"
import { reconcile } from "./automerge-plugin/plugin"

type EditorProps = {
  handle: DocHandle<{ text: string }>
  path: Prop[]
}

function Editor({ handle, path }: EditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRoot = useRef<EditorView>()

  useEffect(() => {
    const doc = handle.docSync();
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

    const handleChange = ({ doc, patchInfo }) => {
      reconcile(handle, view)
    }

    handle.addListener("change", handleChange)

    return () => {
      handle.removeListener("change", handleChange)
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
  const handle = useRef<DocHandle<{ text: string }>>()
  const [,forceUpdate] = useState({})

  useEffect(() => {
    const repo = new Repo({
      network: [],
      // storage: new IndexedDBStorageAdapter(),
      sharePolicy: async (peerId, documentId) => true // this is the default
    })
    

    handle.current = repo.create()

    handle.current.change((doc: any) => {
      doc.text = "hello world"
    });

    window.handle = handle.current
    forceUpdate({})
  }, [])

  if(!handle.current) {
    return null;
  }

  return (
    <Editor handle={handle.current} path={['text']} />
  )
}

export default {
  title: 'Automerge',
};


export const EditorStory = {
  render: () => <Story />
};
