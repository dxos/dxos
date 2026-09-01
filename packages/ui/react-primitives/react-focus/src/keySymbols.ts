//
// Copyright 2023 DXOS.org
//

import { getHostPlatform } from '@dxos/util';

// Resources.
// https://www.w3.org/TR/DOM-Level-3-Events/#events-keyboardevents
// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
// https://developer.apple.com/design/human-interface-guidelines/designing-for-macos
// https://support.apple.com/en-us/HT201236
// https://support.apple.com/guide/mac-help/what-are-those-symbols-shown-in-menus-cpmh0011/mac

const ctrl: Record<string, string> = {
  macos: '⌃',
  ios: '⌃',
  windows: 'Ctrl',
  linux: 'Ctrl',
  unknown: 'Ctrl',
};

const alt: Record<string, string> = {
  macos: '⌥',
  ios: '⌥',
  windows: 'Alt',
  linux: 'Alt',
  unknown: 'Alt',
};

const meta: Record<string, string> = {
  macos: '⌘',
  ios: '⌘',
  windows: '⊞',
  // TODO(wittjosiah): Use ⌘ or ⊞ instead? Wait for user feedback.
  // From https://en.wikipedia.org/wiki/Super_key_(keyboard_button).
  linux: '❖',
  unknown: '❖',
};

const getSymbol = (part: string) => {
  const platform = getHostPlatform();
  switch (part.toLowerCase()) {
    // Mods.
    case 'alt':
      return alt[platform];
    case 'ctrl':
      return ctrl[platform];
    case 'meta':
      return meta[platform];
    case 'shift':
      return '⇧';
    // Special keys.
    case 'backspace':
      return '⌫';
    case 'enter':
      return '⏎';
    case 'escape':
      return '⎋';
    case 'space':
      return '␣';
    case 'tab':
      return '⇥';
    default:
      return part.toUpperCase();
  }
};

/**
 * The key caps to render for a binding, one per element.
 *
 * Splits sequences (`g > h`) as well as chords (`meta+k`): Zag's parser accepts both, and a
 * sequence left whole renders as a single cap reading `G > H`. Nothing binds a sequence today —
 * this keeps the formatter honest if something does.
 */
export const keySymbols = (keyBinding: string): string[] =>
  keyBinding
    .split('>')
    .flatMap((step) => step.trim().split('+'))
    .filter(Boolean)
    .map(getSymbol);
