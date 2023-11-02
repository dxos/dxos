//
// Copyright 2023 DXOS.org
//

// https://support.apple.com/en-us/HT201236
// https://support.apple.com/guide/mac-help/what-are-those-symbols-shown-in-menus-cpmh0011/mac
// https://www.npmjs.com/package/mousetrap
// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
// https://www.w3.org/TR/DOM-Level-3-Events/#events-keyboardevents
// TODO(burdon): Mac/Windows.
const symbols: Record<string, string> = {
  ctrl: '⌃',
  shift: '⇧',
  alt: '⌥',
  meta: '⌘',
};

export type KeyBinding = {
  key: string;
};

export const keyString = (keyBinding: string) => {
  const parts = keyBinding.split('+');
  return parts.map((part) => symbols[part] ?? part.toUpperCase()).join('');
};
