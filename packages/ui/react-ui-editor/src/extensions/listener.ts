//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { isNonNullable } from '@dxos/util';

import { documentId } from './selection';

export type ListenerOptions = {
  onFocus?: (focusing: boolean) => void;
  onChange?: (text: string, id: string) => void;
};

export const listener = ({ onFocus, onChange }: ListenerOptions): Extension => {
  return [
    onFocus &&
      EditorView.focusChangeEffect.of((state, focusing) => {
        onFocus(focusing);
        return null;
      }),

    onChange &&
      EditorView.updateListener.of(({ state, docChanged }) => {
        if (docChanged) {
          onChange(state.doc.toString(), state.facet(documentId));
        }
      }),
  ].filter(isNonNullable);
};
