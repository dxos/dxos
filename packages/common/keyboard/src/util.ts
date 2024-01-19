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
  switch (part) {
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
    case 'Backspace':
      return '⌫';
    case 'Enter':
      return '⏎';
    case 'Escape':
      return '⎋';
    case 'Space':
      return '␣';
    case 'Tab':
      return '⇥';
    default:
      return part.toUpperCase();
  }
};

export const keySymbols = (keyBinding: string): string[] => {
  const parts = keyBinding.split('+');
  return parts.map(getSymbol);
};
