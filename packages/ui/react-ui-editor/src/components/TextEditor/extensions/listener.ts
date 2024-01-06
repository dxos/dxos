//
// Copyright 2023 DXOS.org
//

import { type Extension, StateField } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { nonNullable } from '@dxos/util';

export type ListenerOptions = {
  onFocus?: (focused: boolean) => void;
  onChange?: (text: string) => void;
};

/**
 * Event listener.
 */
export const listener = ({ onFocus, onChange }: ListenerOptions): Extension =>
  [
    onFocus
      ? EditorView.focusChangeEffect.of((view, focused) => {
          onFocus(focused);
          return null;
        })
      : undefined,

    onChange
      ? StateField.define({
          create: () => null,
          update: (_value, transaction) => {
            if (transaction.docChanged) {
              onChange(transaction.newDoc.toString());
            }

            return null;
          },
        })
      : undefined,
  ].filter(nonNullable);
