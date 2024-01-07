//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export type ListenerOptions = {
  onFocus?: (focused: boolean) => void;
  onChange?: (text: string) => void;
};

/**
 * Event listener.
 */
export const listener = ({ onFocus, onChange }: ListenerOptions): Extension => {
  const extensions: Extension[] = [];

  onFocus &&
    extensions.push(
      EditorView.focusChangeEffect.of((_, focused) => {
        onFocus(focused);
        return null;
      }),
    );

  onChange &&
    extensions.push(
      EditorView.updateListener.of((update) => {
        onChange(update.state.doc.toString());
      }),
    );

  return extensions;
};
