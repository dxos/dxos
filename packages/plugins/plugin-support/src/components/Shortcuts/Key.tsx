//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { keySymbols } from '@dxos/react-focus';
import * as Icon from '@dxos/react-ui/Icon';

/**
 * Key symbols drawn as icons: each glyph sits at its own size and baseline in the text font, so a
 * row of caps mixing `⌃`, `⌘` and `/` read as three different sizes.
 */
const KEY_ICONS: Record<string, string> = {
  '⌘': 'ph--command--regular',
  '⌃': 'ph--control--regular',
  '⌥': 'ph--option--regular',
  '⇧': 'ph--arrow-fat-up--regular',
  '⌫': 'ph--backspace--regular',
  '⏎': 'ph--key-return--regular',
  '⇥': 'ph--arrow-line-right--regular',
};

// TODO(burdon): Use https://ark-ui.com/docs/utilities/hotkeys
export const Key = ({ binding }: { binding: string }) => (
  <kbd role='term' className='inline-flex gap-1' aria-label={binding} id={binding}>
    {keySymbols(binding).map((symbol, index) => (
      <span
        key={index}
        className='flex min-w-6 h-6 px-1 justify-center items-center rounded-sm bg-input-surface text-fg font-mono text-sm'
      >
        {KEY_ICONS[symbol] ? <Icon.Icon icon={KEY_ICONS[symbol]} size='md' /> : symbol.toLowerCase()}
      </span>
    ))}
  </kbd>
);
