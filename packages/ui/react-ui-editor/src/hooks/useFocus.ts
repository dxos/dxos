//
// Copyright 2024 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import { useState } from 'react';

import { type EditorModel } from './useTextModel';

export const useFocus = () => {
  const [view, setView] = useState<EditorView>();

  return {
    ready: (view: EditorView, model: EditorModel) => {
      console.log('ready', model.id);
      setView(view);
    },
    focus: (id: string) => {
      console.log('focus', id);
      view?.focus();
    },
  };
};
