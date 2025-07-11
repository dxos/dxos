//
// Copyright 2024 DXOS.org
//

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { bracketMatching, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
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
import defaultsDeep from 'lodash.defaultsdeep';
import merge from 'lodash.merge';

import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { type DocAccessor, type Space } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemeMode } from '@dxos/react-ui';
import { type HuePalette } from '@dxos/react-ui-theme';
import { hexToHue, isNotFalsy } from '@dxos/util';

import { automerge } from './automerge';
import { SpaceAwarenessProvider, awareness } from './awareness';
import { focus } from './focus';
import { editorGutter, editorMonospace } from '../defaults';
import { type ThemeStyles, defaultTheme } from '../styles';

//
// Basic
//

export const preventNewline = EditorState.transactionFilter.of((tr) => (tr.newDoc.lines > 1 ? [] : tr));

/**
 * https://codemirror.net/docs/extensions
 * https://github.com/codemirror/basic-setup
 * https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
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
  monospace?: boolean;
  placeholder?: string;
  /** If true user cannot edit the text, but they can still select and copy it. */
  readOnly?: boolean;
  search?: boolean;
  scrollPastEnd?: boolean;
  standardKeymap?: boolean;
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
  search: true,
};

const keymaps: { [key: string]: readonly KeyBinding[] } = {
  // https://codemirror.net/docs/ref/#commands.standardKeymap
  standard: standardKeymap,
  // https://codemirror.net/docs/ref/#commands.defaultKeymap
  default: defaultKeymap,
};

export const createBasicExtensions = (_props?: BasicExtensionsOptions): Extension => {
  const props: BasicExtensionsOptions = defaultsDeep({}, _props, defaultBasicOptions);
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
    props.monospace && editorMonospace,
    props.placeholder && placeholder(props.placeholder),
    props.readOnly !== undefined && EditorState.readOnly.of(props.readOnly),
    props.scrollPastEnd && scrollPastEnd(),
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
      ].filter(isNotFalsy),
    ),
  ].filter(isNotFalsy);
};

//
// Theme
//

export type ThemeExtensionsOptions = {
  themeMode?: ThemeMode;
  styles?: ThemeStyles;
  syntaxHighlighting?: boolean;
  slots?: {
    editor?: {
      className?: string;
    };
    scroll?: {
      className?: string;
    };
    content?: {
      className?: string;
    };
  };
};

const defaultThemeSlots = {
  editor: {
    className: 'w-full bs-full',
  },
};

/**
 * https://codemirror.net/examples/styling
 */
export const createThemeExtensions = ({
  themeMode,
  styles,
  syntaxHighlighting: _syntaxHighlighting,
  slots: _slots,
}: ThemeExtensionsOptions = {}): Extension => {
  const slots = defaultsDeep({}, _slots, defaultThemeSlots);
  return [
    EditorView.darkTheme.of(themeMode === 'dark'),
    EditorView.baseTheme(styles ? merge({}, defaultTheme, styles) : defaultTheme),
    // https://github.com/codemirror/theme-one-dark
    _syntaxHighlighting &&
      (themeMode === 'dark' ? syntaxHighlighting(oneDarkHighlightStyle) : syntaxHighlighting(defaultHighlightStyle)),
    slots.editor?.className && EditorView.editorAttributes.of({ class: slots.editor.className }),
    slots.content?.className && EditorView.contentAttributes.of({ class: slots.content.className }),
    slots.scroll?.className &&
      ViewPlugin.fromClass(
        class {
          constructor(view: EditorView) {
            view.scrollDOM.classList.add(slots.scroll.className);
          }
        },
      ),
  ].filter(isNotFalsy);
};

//
// Data
//

export type DataExtensionsProps<T> = {
  id: string;
  text?: DocAccessor<T>;
  space?: Space;
  identity?: Identity | null;
};

// TODO(burdon): Move out of react-ui-editor (remove echo deps).
export const createDataExtensions = <T>({ id, text, space, identity }: DataExtensionsProps<T>): Extension[] => {
  const extensions: Extension[] = [];
  if (text) {
    extensions.push(automerge(text));
  }

  if (space && identity) {
    const peerId = identity?.identityKey.toHex();
    const hue = (identity?.profile?.data?.hue as HuePalette | undefined) ?? hexToHue(peerId ?? '0');

    extensions.push(
      awareness(
        new SpaceAwarenessProvider({
          space,
          channel: `awareness.${id}`,
          peerId: identity.identityKey.toHex(),
          info: {
            displayName: identity.profile?.displayName ?? generateName(identity.identityKey.toHex()),
            darkColor: `var(--dx-${hue}Cursor)`,
            lightColor: `var(--dx-${hue}Cursor)`,
          },
        }),
      ),
    );
  }

  return extensions;
};
