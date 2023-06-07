//
// Copyright 2023 DXOS.org
//

import { Dispatch, RefObject, SetStateAction, useCallback, useState } from 'react';

import { MarkdownComposerRef } from '@dxos/aurora-composer';
import { log } from '@dxos/log';
import { useFileDownload } from '@dxos/react-appkit';
import { YText, YXmlFragment } from '@dxos/text-model';

export const useTextFile = ({
  content,
  editorRef,
}: {
  content: YText | YXmlFragment | undefined;
  editorRef: RefObject<MarkdownComposerRef>;
}): {
  fileImportDialogOpen: boolean;
  setFileImportDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleFileExport: () => void;
  handleFileImport: (file: File) => Promise<void>;
} => {
  const download = useFileDownload();
  const [fileImportDialogOpen, setFileImportDialogOpen] = useState(false);

  const handleFileExport = useCallback(() => {
    if (content) {
      download(new Blob([content.toString()], { type: 'text/plain' }), `${document.title}.md`);
    }
  }, [document, content]);

  const handleFileImport = useCallback(
    async (file: File) => {
      if (content && editorRef.current?.view) {
        try {
          const data = new Uint8Array(await file.arrayBuffer());
          const md = new TextDecoder('utf-8').decode(data);
          editorRef.current.view.dispatch({
            changes: { from: 0, to: editorRef.current.view.state.doc.length, insert: md },
          });
        } catch (err) {
          log.catch(err);
        }
        setFileImportDialogOpen(false);
      }
    },
    [content],
  );

  return { fileImportDialogOpen, setFileImportDialogOpen, handleFileExport, handleFileImport };
};
