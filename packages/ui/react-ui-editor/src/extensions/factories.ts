//
// Copyright 2024 DXOS.org
//

import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab, standardKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { searchKeymap } from '@codemirror/search';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  type KeyBinding,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder,
  scrollPastEnd,
} from '@codemirror/view';
import defaultsDeep from 'lodash.defaultsdeep';

import { generateName } from '@dxos/display-name';
import { log } from '@dxos/log';
import { type DocAccessor, type Space } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemeMode } from '@dxos/react-ui';
import { type HuePalette, hueTokens } from '@dxos/react-ui-theme';
import { hexToHue, isNotFalsy } from '@dxos/util';

import { automerge } from './automerge';
import { awareness, SpaceAwarenessProvider } from './awareness';
import { type ThemeStyles } from '../styles';
import { defaultTheme } from '../themes';

//
// Basic
//

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
  highlightActiveLine?: boolean;
  history?: boolean;
  indentWithTab?: boolean;
  keymap?: null | 'default' | 'standard';
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  placeholder?: string;
  readonly?: boolean;
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
  editable: true,
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
    props.drawSelection && drawSelection(),
    props.highlightActiveLine && highlightActiveLine(),
    props.history && history(),
    props.lineNumbers && lineNumbers(),
    props.lineWrapping && EditorView.lineWrapping,
    props.placeholder && placeholder(props.placeholder),
    props.readonly && [EditorState.readOnly.of(true), EditorView.editable.of(false)],
    props.scrollPastEnd && scrollPastEnd(),
    props.tabSize && EditorState.tabSize.of(props.tabSize),

    // https://codemirror.net/docs/ref/#view.KeyBinding
    keymap.of(
      [
        ...((props.keymap && keymaps[props.keymap]) ?? []),
        // https://codemirror.net/docs/ref/#commands.indentWithTab
        ...(props.indentWithTab ? [indentWithTab] : []),
        // https://codemirror.net/docs/ref/#autocomplete.closeBracketsKeymap
        ...(props.closeBrackets ? closeBracketsKeymap : []),
        // https://codemirror.net/docs/ref/#commands.historyKeymap
        ...(props.history ? historyKeymap : []),
        // https://codemirror.net/docs/ref/#search.searchKeymap
        ...(props.search ? searchKeymap : []),
      ].filter(isNotFalsy),
    ),
  ].filter(isNotFalsy);
};

//
// Theme
//

export type ThemeExtensionsOptions = {
  theme?: ThemeStyles;
  themeMode?: ThemeMode;
  slots?: {
    editor?: {
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

export const createThemeExtensions = ({ theme, themeMode, slots: _slots }: ThemeExtensionsOptions = {}): Extension => {
  const slots = defaultsDeep({}, _slots, defaultThemeSlots);
  return [
    EditorView.baseTheme(defaultTheme),
    EditorView.darkTheme.of(themeMode === 'dark'),
    theme && EditorView.theme(theme),
    slots.editor?.className && EditorView.editorAttributes.of({ class: slots.editor.className }),
    slots.content?.className && EditorView.contentAttributes.of({ class: slots.content.className }),
  ].filter(isNotFalsy);
};

//
// Data
//

export type DataExtensionsProps = {
  id: string;
  text?: DocAccessor;
  space?: Space;
  identity?: Identity | null;
};

// TODO(burdon): Move out of react-ui-editor (remove echo deps).
export const createDataExtensions = ({ id, text, space, identity }: DataExtensionsProps): Extension[] => {
  const extensions: Extension[] = text ? [automerge(text)] : [];

  if (space && identity) {
    const peerId = identity?.identityKey.toHex();
    const { cursorLightValue, cursorDarkValue } =
      hueTokens[(identity?.profile?.data?.hue as HuePalette | undefined) ?? hexToHue(peerId ?? '0')];
    const awarenessProvider = new SpaceAwarenessProvider({
      space,
      channel: `awareness.${id}`,
      peerId: identity.identityKey.toHex(),
      info: {
        displayName: identity.profile?.displayName ?? generateName(identity.identityKey.toHex()),
        color: cursorDarkValue,
        lightColor: cursorLightValue,
      },
    });

    extensions.push(awareness(awarenessProvider));
  }

  return extensions;
};
