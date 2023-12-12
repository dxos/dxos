//
// Copyright 2023 DXOS.org
//

import type { BlockNoteEditor } from '@blocknote/core';
import React, { forwardRef, memo, type Ref } from 'react';

import { YXmlFragment } from '@dxos/text-model';

import { useTextModel, type EditorSlots, type UseTextModelOptions } from '../../model';
import { BNEditor } from '../BlockNote';
import { MarkdownEditor, type MarkdownEditorRef } from '../Markdown';
import { type TipTapEditor } from '../RichText';

export type EditorProps = UseTextModelOptions & {
  slots?: EditorSlots;
};

/**
 * Memoized editor which depends on DXOS platform.
 *
 * Determines which editor to render based on the kind of text.
 */
// NOTE: Without `memo`, if parent component uses `observer` the editor re-renders excessively.
// TODO(wittjosiah): Factor out?
export const Editor = memo(
  forwardRef<TipTapEditor | BlockNoteEditor | MarkdownEditorRef, EditorProps>(({ slots, ...params }, forwardedRef) => {
    const model = useTextModel(params);
    if (model?.content instanceof YXmlFragment) {
      return <BNEditor ref={forwardedRef as Ref<BlockNoteEditor>} model={model} slots={slots} />;
    } else {
      return <MarkdownEditor ref={forwardedRef as Ref<MarkdownEditorRef>} model={model} slots={slots} />;
    }
  }),
);
