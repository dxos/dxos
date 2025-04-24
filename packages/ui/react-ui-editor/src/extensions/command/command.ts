//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

import { hintViewPlugin } from './hint';
import { floatingMenu } from './menu';
import { preview } from './preview';
import { closeEffect, commandConfig, commandKeyBindings, commandState } from './state';

// TODO(burdon): Create knowledge base for CM notes and ideas.
// https://discuss.codemirror.net/t/inline-code-hints-like-vscode/5533/4
// https://github.com/saminzadeh/codemirror-extension-inline-suggestion
// https://github.com/ChromeDevTools/devtools-frontend/blob/main/front_end/ui/components/text_editor/config.ts#L370

// TODO(burdon): Discriminated union.
export type CommandAction = {
  insert?: string;
};

export type CommandOptions = {
  onHint: () => string | undefined;
  onRenderDialog: (el: HTMLElement, cb: (action?: CommandAction) => void) => void;
  onRenderMenu: (el: HTMLElement, cb: () => void) => void;
  onRenderPreview: (el: HTMLElement, url: string, text: string) => void;
};

export const command = (options: CommandOptions): Extension => {
  return [
    commandConfig.of(options),
    commandState,
    keymap.of(commandKeyBindings),
    preview(options),
    floatingMenu(options),
    hintViewPlugin(options),
    EditorView.focusChangeEffect.of((_, focusing) => {
      return focusing ? closeEffect.of(null) : null;
    }),
    EditorView.theme({
      '.cm-tooltip': {
        background: 'transparent',
      },
      '.cm-preview': {
        marginLeft: '-1rem',
        marginRight: '-1rem',
        padding: '1rem',
        background: 'var(--dx-hoverSurface)',
        border: '1px solid var(--dx-separator)',
        borderRadius: '4px',
      },
    }),
  ];
};
