//
// Copyright 2023 DXOS.org
//

import { Dispatch, RefObject, SetStateAction, useCallback, useState } from 'react';
import { Converter } from 'showdown';
import TurndownService from 'turndown';

import { TipTapEditor } from '@dxos/aurora-composer';
import { useFileDownload } from '@dxos/react-appkit';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  codeBlockStyle: 'fenced',
});

const converter = new Converter();

const nestedParagraphOutput = / +\n/g;

export const useRichTextFile = (
  editorRef: RefObject<TipTapEditor>,
): {
  fileImportDialogOpen: boolean;
  setFileImportDialogOpen: Dispatch<SetStateAction<boolean>>;
  handleFileExport: () => void;
  handleFileImport: (file: File) => Promise<void>;
} => {
  const download = useFileDownload();
  const [fileImportDialogOpen, setFileImportDialogOpen] = useState(false);

  const handleFileExport = useCallback(() => {
    const editor = editorRef.current;
    const html = editor?.getHTML();
    if (html) {
      download(
        new Blob([turndownService.turndown(html).replaceAll(nestedParagraphOutput, '')], { type: 'text/plain' }),
        `${document.title}.md`,
      );
    }
  }, [document, editorRef.current]);

  const handleFileImport = useCallback(
    async (file: File) => {
      const editor = editorRef.current;
      if (editor) {
        const data = new Uint8Array(await file.arrayBuffer());
        const md = new TextDecoder('utf-8').decode(data);
        editor.commands.setContent(converter.makeHtml(md));
        setFileImportDialogOpen(false);
      }
    },
    [document, editorRef.current],
  );

  return { fileImportDialogOpen, setFileImportDialogOpen, handleFileExport, handleFileImport };
};
