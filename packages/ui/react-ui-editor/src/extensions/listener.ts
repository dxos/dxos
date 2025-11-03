//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { isNonNullable } from '@dxos/util';

import { documentId } from './selection';

export type ListenerOptions = {
  onFocus?: (event: { id: string; focusing: boolean }) => void;
  onChange?: (event: { id: string; text: string }) => void;
};

export const listener = ({ onFocus, onChange }: ListenerOptions): Extension =>
  [
    onFocus &&
      EditorView.focusChangeEffect.of((state, focusing) => {
        onFocus({ id: state.facet(documentId), focusing });
        return null;
      }),

    onChange &&
      EditorView.updateListener.of(({ state, docChanged }) => {
        if (docChanged) {
          onChange({ id: state.facet(documentId), text: state.doc.toString() });
        }
      }),
  ].filter(isNonNullable);
