//
// Copyright 2024 DXOS.org
//

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { HighlightStyle, bracketMatching, syntaxHighlighting } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { type ChangeSpec, EditorState, type Extension, type TransactionSpec } from '@codemirror/state';
import {
  EditorView,
  type KeyBinding,
  ViewPlugin,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder,
  scrollPastEnd,
} from '@codemirror/view';
import { vscodeDarkStyle, vscodeLightStyle } from '@uiw/codemirror-theme-vscode';
import defaultsDeep from 'lodash.defaultsdeep';

import { generateName } from '@dxos/display-name';
import { type DocAccessor } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { type Messenger } from '@dxos/protocols';
import { type Identity } from '@dxos/protocols/proto/dxos/client/services';
import { type HuePalette } from '@dxos/ui-theme';
import { type ThemeMode } from '@dxos/ui-types';
import { hexToHue, isTruthy } from '@dxos/util';

import { createBaseTheme, editorGutter } from '../styles';

import { automerge } from './automerge';
import { SpaceAwarenessProvider, awareness } from './awareness';
import { focus } from './focus';

//
// Basic
//

/**
 * Enable tabbing into editor (required for tabster to work).
 */
export const tabbable = EditorView.contentAttributes.of({ tabindex: '0' });

export const filterChars = (chars: RegExp) => {
  return EditorState.transactionFilter.of((transaction) => {
    if (!transaction.docChanged) {
      return transaction;
    }

    const changes: ChangeSpec[] = [];
    transaction.changes.iterChanges((fromA, toA, fromB, toB, text) => {
      const inserted = text.toString();
      const filtered = inserted.replace(chars, '');
      if (inserted !== filtered) {
        changes.push({
          from: fromB,
          to: toB,
          insert: filtered,
        });
      }
    });

    if (changes.length) {
      return [transaction, { changes, sequential: true } as TransactionSpec];
    }

    return transaction;
  });
};

/**
 * https://codemirror.net/docs/extensions
 * https://github.com/codemirror/basic-setup
 * https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
 * https://github.com/codemirror/theme-one-dark
 */
export type BasicExtensionsOptions = {
  allowMultipleSelections?: boolean;
  bracketMatching?: boolean;
  closeBrackets?: boolean;
  dropCursor?: boolean;
  drawSelection?: boolean;
  editable?: boolean;
  focus?: boolean;
  highlightActiveLine?: boolean;
  history?: boolean;
  indentWithTab?: boolean;
  keymap?: null | 'default' | 'standard';
  lineNumbers?: boolean;
  /** If false then do not set a max-width or side margin on the editor. */
  lineWrapping?: boolean;
  placeholder?: string;
  /** If true user cannot edit the text, but they can still select and copy it. */
  readOnly?: boolean;
  search?: boolean;
  /** NOTE: Do not use with stack sections. */
  scrollPastEnd?: boolean;
  standardKeymap?: boolean;
  tabbable?: boolean;
  tabSize?: number;
};

const defaultBasicOptions: BasicExtensionsOptions = {
  allowMultipleSelections: true,
  bracketMatching: true,
  closeBrackets: true,
  drawSelection: true,
  focus: true,
  history: true,
  keymap: 'standard',
  lineWrapping: true,
  search: false,
} as const;

const keymaps: { [key: string]: readonly KeyBinding[] } = {
  // https://codemirror.net/docs/ref/#commands.standardKeymap
  standard: standardKeymap,
  // https://codemirror.net/docs/ref/#commands.defaultKeymap
  default: defaultKeymap,
};

export const createBasicExtensions = (propsParam?: BasicExtensionsOptions): Extension => {
  const props = defaultsDeep({}, propsParam, defaultBasicOptions);
  return [
    // NOTE: Doesn't catch errors in keymap functions.
    EditorView.exceptionSink.of((err) => {
      log.catch(err);
    }),

    props.allowMultipleSelections && EditorState.allowMultipleSelections.of(true),
    props.bracketMatching && bracketMatching(),
    props.closeBrackets && closeBrackets(),
    props.dropCursor && dropCursor(),
    props.drawSelection && drawSelection({ cursorBlinkRate: 1_200 }),
    props.editable !== undefined && EditorView.editable.of(props.editable),
    props.focus && focus,
    props.highlightActiveLine && highlightActiveLine(),
    props.history && history(),
    props.lineNumbers && [lineNumbers(), editorGutter],
    props.lineWrapping && EditorView.lineWrapping,
    props.placeholder && placeholder(props.placeholder),
    props.readOnly !== undefined && EditorState.readOnly.of(props.readOnly),
    props.scrollPastEnd && scrollPastEnd(),
    props.tabbable && tabbable,
    props.tabSize && EditorState.tabSize.of(props.tabSize),

    // https://codemirror.net/docs/ref/#view.KeyBinding
    keymap.of(
      [
        ...((props.keymap && keymaps[props.keymap]) ?? []),
        // NOTE: Tabs are also configured by markdown extension.
        // https://codemirror.net/docs/ref/#commands.indentWithTab
        ...(props.indentWithTab ? [indentWithTab] : []),
        // https://codemirror.net/docs/ref/#autocomplete.closeBracketsKeymap
        ...(props.closeBrackets ? closeBracketsKeymap : []),
        // https://codemirror.net/docs/ref/#commands.historyKeymap
        ...(props.history ? historyKeymap : []),
        // https://codemirror.net/docs/ref/#search.searchKeymap
        ...(props.search ? searchKeymap : []),
        // Disable bindings that conflict with system shortcuts.
        // TODO(burdon): Catalog global shortcuts.
        {
          key: 'Mod-Shift-k',
          preventDefault: true,
          run: () => true,
        },
      ].filter(isTruthy),
    ),
  ].filter(isTruthy);
};

//
// Theme
//

export type ThemeExtensionsOptions = {
  monospace?: boolean;
  themeMode?: ThemeMode;
  slots?: {
    editor?: {
      className?: string;
    };
    scroll?: {
      // NOTE: Do not apply vertical padding to scroll container.
      className?: string;
    };
    content?: {
      className?: string;
    };
  };
  syntaxHighlighting?: boolean;
};

export const grow: ThemeExtensionsOptions['slots'] = {
  editor: {
    className: 'bs-full is-full',
  },
} as const;

export const fullWidth: ThemeExtensionsOptions['slots'] = {
  editor: {
    className: 'is-full',
  },
} as const;

export const defaultThemeSlots = grow;

export const defaultStyles = {
  dark: vscodeDarkStyle,
  light: vscodeLightStyle,
};

/**
 * https://codemirror.net/examples/styling
 */
export const createThemeExtensions = ({
  monospace,
  themeMode,
  slots: slotsParam,
  syntaxHighlighting: syntaxHighlightingParam,
}: ThemeExtensionsOptions = {}): Extension => {
  const slots = defaultsDeep({}, slotsParam, defaultThemeSlots);
  return [
    EditorView.darkTheme.of(themeMode === 'dark'),
    createBaseTheme({ monospace }),
    syntaxHighlightingParam &&
      syntaxHighlighting(HighlightStyle.define(themeMode === 'dark' ? defaultStyles.dark : defaultStyles.light)),
    slots.editor?.className && EditorView.editorAttributes.of({ class: slots.editor.className }),
    slots.content?.className && EditorView.contentAttributes.of({ class: slots.content.className }),
    slots.scroll?.className &&
      ViewPlugin.fromClass(
        class {
          constructor(view: EditorView) {
            view.scrollDOM.classList.add(...slots.scroll.className.split(/\s+/));
          }
        },
      ),
  ].filter(isTruthy);
};

//
// Data
//

export type DataExtensionsProps<T> = {
  id: string;
  text?: DocAccessor<T>;
  messenger?: Messenger;
  identity?: Identity | null;
};

export const createDataExtensions = <T>({ id, text, messenger, identity }: DataExtensionsProps<T>): Extension[] => {
  const extensions: Extension[] = [];
  if (text) {
    extensions.push(automerge(text));
  }

  if (messenger && identity) {
    const peerId = identity?.identityKey.toHex();
    const hue = (identity?.profile?.data?.hue as HuePalette | undefined) ?? hexToHue(peerId ?? '0');
    extensions.push(
      awareness(
        new SpaceAwarenessProvider({
          messenger,
          channel: `awareness.${id}`,
          peerId: identity.identityKey.toHex(),
          info: {
            darkColor: `var(--dx-${hue}Cursor)`,
            lightColor: `var(--dx-${hue}Cursor)`,
            displayName: identity.profile?.displayName ?? generateName(identity.identityKey.toHex()),
          },
        }),
      ),
    );
  }

  return extensions;
};
