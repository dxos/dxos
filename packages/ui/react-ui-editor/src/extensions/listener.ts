//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

export type ListenerOptions = {
  onFocus?: (focusing: boolean) => void;
  onChange?: (text: string) => void;
};

/**
 * Event listener.
 * @deprecated Use EditorView.updateListener and listen for specific update events.
 */
export const listener = ({ onFocus, onChange }: ListenerOptions): Extension => {
  const extensions: Extension[] = [];

  onFocus &&
    extensions.push(
      EditorView.focusChangeEffect.of((_, focusing) => {
        onFocus(focusing);
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
