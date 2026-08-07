//
// Copyright 2026 DXOS.org
//

import emojiData from '@emoji-mart/data';
import EmojiMart from '@emoji-mart/react';
import React from 'react';

export type EmojiMartPanelProps = {
  onEmojiSelect: (emoji: { native?: string }) => void;
  themeMode?: string;
};

/**
 * The emoji-mart picker and its emoji database (~480 KB), isolated in its own module so the
 * default export can be lazily imported — the database is otherwise resident in every tab via
 * the pickers barrel, for a panel that only renders once a user opens it.
 */
const EmojiMartPanel = ({ onEmojiSelect, themeMode }: EmojiMartPanelProps) => (
  // https://github.com/missive/emoji-mart?tab=readme-ov-file#options--props
  <EmojiMart
    data={emojiData}
    onEmojiSelect={onEmojiSelect}
    autoFocus={true}
    maxFrequentRows={0}
    noCountryFlags={true}
    theme={themeMode}
  />
);

export default EmojiMartPanel;
