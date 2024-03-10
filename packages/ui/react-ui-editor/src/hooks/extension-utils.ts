//
// Copyright 2024 DXOS.org
//

import { closeBrackets } from '@codemirror/autocomplete';
import { history } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  lineNumbers,
  placeholder,
  scrollPastEnd,
} from '@codemirror/view';
import defaultsDeep from 'lodash.defaultsdeep';
import { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { createDocAccessor, getTextContent, type TextObject, type DocAccessor } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type Space } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';
import { type ThemeMode } from '@dxos/react-ui';
import { type HuePalette, hueTokens } from '@dxos/react-ui-theme';
import { hexToHue, isNotFalsy } from '@dxos/util';

import { SpaceAwarenessProvider } from './awareness-provider';
import { automerge, awareness } from '../extensions';
import { type ThemeStyles } from '../styles';
import { defaultTheme } from '../themes';

// TODO(burdon): Move into extensions folder.

//
// Basic
//

/**
 * https://codemirror.net/docs/extensions
 * https://github.com/codemirror/basic-setup
 */
// TODO(burdon): Reconcile with createMarkdownExtensions.
export type BasicExtensionsOptions = {
  allowMultipleSelections?: boolean;
  bracketMatching?: boolean;
  closeBrackets?: boolean;
  crosshairCursor?: boolean;
  dropCursor?: boolean;
  drawSelection?: boolean;
  editable?: boolean;
  highlightActiveLine?: boolean;
  history?: boolean;
  lineNumbers?: boolean;
  lineWrapping?: boolean;
  placeholder?: string;
  readonly?: boolean;
  scrollPastEnd?: boolean;
  tabSize?: number;
};

const defaults: BasicExtensionsOptions = {
  bracketMatching: true,
  closeBrackets: true,
  drawSelection: true,
  editable: true,
  history: true,
  lineWrapping: true,
};

export const createBasicExtensions = (_props?: BasicExtensionsOptions): Extension => {
  const props: BasicExtensionsOptions = defaultsDeep({}, _props, defaults);
  return [
    // TODO(burdon): Doesn't catch errors in keymap functions.
    EditorView.exceptionSink.of((err) => {
      log.catch(err);
    }),

    props.allowMultipleSelections && EditorState.allowMultipleSelections.of(true),
    props.bracketMatching && bracketMatching(),
    props.closeBrackets && closeBrackets(),
    props.crosshairCursor && crosshairCursor(),
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

export const createThemeExtensions = ({ theme, themeMode, slots }: ThemeExtensionsOptions = {}): Extension => {
  return [
    EditorView.baseTheme(defaultTheme),
    EditorView.darkTheme.of(themeMode === 'dark'),
    theme && EditorView.theme(theme),
    slots?.editor?.className && EditorView.editorAttributes.of({ class: slots.editor.className }),
    slots?.content?.className && EditorView.contentAttributes.of({ class: slots.content.className }),
  ].filter(isNotFalsy);
};

//
// Data
//

export type DataExtensionsProps = {
  id: string;
  text: DocAccessor;
  space?: Space;
  identity?: Identity;
};

// TODO(burdon): Factor out automerge defs and extension (not hook).
// TODO(burdon): Move out of react-ui-editor (remove echo deps).
export const createDataExtensions = ({ id, text, space, identity }: DataExtensionsProps): Extension[] => {
  const extensions: Extension[] = [automerge(text)];

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

// TODO(burdon): Factor out.
export const useDocAccessor = <T = any>(text: TextObject): { doc: string | undefined; accessor: DocAccessor<T> } => {
  return useMemo(
    () => ({
      doc: getTextContent(text),
      accessor: createDocAccessor<T>(text),
    }),
    [text],
  );
};
