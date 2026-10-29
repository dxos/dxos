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
  macos: '\u2303',
  ios: '\u2303',
  windows: 'Ctrl',
  linux: 'Ctrl',
  unknown: 'Ctrl',
};

const alt: Record<string, string> = {
  macos: '\u2325',
  ios: '\u2325',
  windows: 'Alt',
  linux: 'Alt',
  unknown: 'Alt',
};

const meta: Record<string, string> = {
  macos: '\u2318',
  ios: '\u2318',
  windows: '\u229E',
  // TODO(wittjosiah): Use Cmd or [+] instead? Wait for user feedback.
  // From https://en.wikipedia.org/wiki/Super_key_(keyboard_button).
  linux: '\u2756',
  unknown: '\u2756',
};

const getSymbol = (part: string) => {
  const platform = getHostPlatform();
  switch (part.toLowerCase()) {
    // Mods.
    case 'alt':
      return alt[platform];
    // `control` is the hotkey parser's own name for it.
    case 'ctrl':
    case 'control':
      return ctrl[platform];
    case 'meta':
      return meta[platform];
    case 'shift':
      return '\u21E7';
    // Special keys.
    case 'backspace':
      return '\u232B';
    case 'enter':
      return '\u23CE';
    case 'escape':
      return '\u238B';
    case 'space':
      return '\u2423';
    case 'tab':
      return '\u21E5';
    default:
      return part.toUpperCase();
  }
};

/** Marks the boundary between the steps of a sequence binding, as its own element. */
export const SEQUENCE_SYMBOL = '\u2192';

/**
 * The key caps to render for a binding, one per element.
 *
 * Splits sequences (`g > h`) as well as chords (`meta+k`) - Zag's parser accepts both - and keeps
 * the boundary as its own element, since consumers either render one cap per element or join them
 * with no separator. Dropping it would render `g > h` as `GH`. Nothing binds a sequence today;
 * this keeps the formatter honest if something does.
 */
export const keySymbols = (keyBinding: string): string[] =>
  keyBinding
    .split('>')
    .map((step) => step.trim().split('+').filter(Boolean).map(getSymbol))
    .filter((step) => step.length > 0)
    .reduce<string[]>((caps, step, index) => (index === 0 ? step : [...caps, SEQUENCE_SYMBOL, ...step]), []);
