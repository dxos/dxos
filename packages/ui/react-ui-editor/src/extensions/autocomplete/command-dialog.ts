//
// Copyright 2024 DXOS.org
//

import { type Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { isNonNullable } from '@dxos/util';

import { closeEffect, commandKeyBindings } from './action';
import { type HintOptions, hint } from './hint';
import { type PopupOptions, commandConfig, commandState } from './state';

// TODO(burdon): Create knowledge base for CM notes and ideas.
// https://discuss.codemirror.net/t/inline-code-hints-like-vscode/5533/4
// https://github.com/saminzadeh/codemirror-extension-inline-suggestion
// https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/ui/components/text_editor/config.ts#L370

export type CommandOptions = Partial<PopupOptions & HintOptions>;

export const commandDialog = (options: CommandOptions = {}): Extension => {
  return [
    Prec.highest(keymap.of(commandKeyBindings)),
    commandConfig.of(options),
    commandState,
    options.onHint && hint(options),
    EditorView.focusChangeEffect.of((_, focusing) => (focusing ? closeEffect.of(null) : null)),
    EditorView.theme({
      '.cm-tooltip': {
        background: 'transparent',
      },
    }),
  ].filter(isNonNullable);
};
