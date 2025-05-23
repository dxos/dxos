//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { closeEffect, commandKeyBindings } from './action';
import { hintViewPlugin, type HintOptions } from './hint';
import { floatingMenu, type FloatingMenuOptions } from './menu';
import { commandConfig, commandState, type PopupOptions } from './state';

// TODO(burdon): Create knowledge base for CM notes and ideas.
// https://discuss.codemirror.net/t/inline-code-hints-like-vscode/5533/4
// https://github.com/saminzadeh/codemirror-extension-inline-suggestion
// https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/ui/components/text_editor/config.ts#L370

export type CommandOptions = Partial<PopupOptions & FloatingMenuOptions & HintOptions>;

export const command = (options: CommandOptions = {}): Extension => {
  return [
    keymap.of(commandKeyBindings),
    commandConfig.of(options),
    commandState,
    options.renderMenu ? floatingMenu({ renderMenu: options.renderMenu }) : [],
    options.onHint ? hintViewPlugin({ onHint: options.onHint }) : [],
    EditorView.focusChangeEffect.of((_, focusing) => {
      return focusing ? closeEffect.of(null) : null;
    }),
    EditorView.theme({
      '.cm-tooltip': {
        background: 'transparent',
      },
    }),
  ];
};
