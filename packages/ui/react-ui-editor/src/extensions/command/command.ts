//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { hintViewPlugin } from './hint';
import { closeEffect, commandConfig, commandKeymap, commandState } from './state';

// TODO(burdon): Create knowledge base for notes.
// https://discuss.codemirror.net/t/inline-code-hints-like-vscode/5533/4
// https://github.com/saminzadeh/codemirror-extension-inline-suggestion
// https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/ui/components/text_editor/config.ts#L370

// TODO(burdon): Insert text at cursor.

export type CommandAction = {
  insert?: string;
};

export type CommandOptions = {
  onRender: (el: HTMLElement, cb: (action?: CommandAction) => void) => void;
  onHint: () => string | undefined;
};

export const command = (options: CommandOptions): Extension => {
  return [
    commandState,
    keymap.of(commandKeymap),
    hintViewPlugin(options),
    // Close tooltip on focus change.
    EditorView.focusChangeEffect.of((_, focusing) => {
      return focusing ? closeEffect.of(null) : null;
    }),
    commandConfig.of(options),
  ];
};
