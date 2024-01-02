//
// Copyright 2023 DXOS.org
//

// https://www.w3.org/TR/DOM-Level-3-Events/#events-keyboardevents
// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
// https://support.apple.com/en-us/HT201236
// https://support.apple.com/guide/mac-help/what-are-those-symbols-shown-in-menus-cpmh0011/mac

// TODO(burdon): Show Mac/Windows/Linux variants.
const symbols: Record<string, string> = {
  // Mods.
  ctrl: '⌃',
  shift: '⇧',
  alt: '⌥',
  meta: '⌘',

  // Special keys.
  Backspace: '⌫',
  Enter: '⏎',
  Escape: '⎋',
  Space: '␣',
  Tab: '⇥',
};

export const keySymbols = (keyBinding: string): string[] => {
  const parts = keyBinding.split('+');
  return parts.map((part) => symbols[part] ?? part.toUpperCase());
};
