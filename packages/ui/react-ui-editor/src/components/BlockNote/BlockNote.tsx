//
// Copyright 2022 DXOS.org
//

import { type BlockNoteEditor } from '@blocknote/core';
import { BlockNoteView, useBlockNote } from '@blocknote/react';
import React, { forwardRef, useImperativeHandle } from 'react';

import { type YXmlFragment } from '@dxos/text-model';

import '@blocknote/core/style.css';
import { type EditorModel, type EditorSlots } from '../../model';
type UseEditorOptions = {
  model?: EditorModel;
  placeholder?: string;
  slots?: Pick<EditorSlots, 'editor'>;
};

export type RichTextEditorProps = UseEditorOptions & {
  slots?: EditorSlots;
};

export const BNEditor = forwardRef<BlockNoteEditor | null, RichTextEditorProps>((props, ref) => {
  const editor = useBlockNote({
    collaboration: {
      fragment: props.model!.content as YXmlFragment,
      user: { name: props.model!.id, color: '#ff0000' },
      provider: props.model!.provider,
    },
  });
  useImperativeHandle<BlockNoteEditor | null, BlockNoteEditor | null>(ref, () => editor, [editor]);

  return <BlockNoteView {...props.slots?.root} editor={editor} />;
});
