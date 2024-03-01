//
// Copyright 2024 DXOS.org
//
import 'emoji-picker-element';
import { CaretDown } from '@phosphor-icons/react';
import { type Picker } from 'emoji-picker-element';
import { type EmojiClickEvent } from 'emoji-picker-element/shared';
import React, { useCallback, useEffect, useRef } from 'react';

import { type Identity } from '@dxos/react-client/halo';
import { Button, ButtonGroup, Popover, useTranslation } from '@dxos/react-ui';
import { hexToEmoji } from '@dxos/util';

export type EmojiPickerProps = { onEmojiClick: (event: EmojiClickEvent) => void };

export const EmojiPicker = ({ onEmojiClick }: EmojiPickerProps) => {
  const pickerRef = useRef<Picker | null>(null);
  useEffect(() => {
    pickerRef.current?.addEventListener('emoji-click', onEmojiClick);
    return () => pickerRef.current?.removeEventListener('emoji-click', onEmojiClick);
  }, [pickerRef.current, onEmojiClick]);
  return <emoji-picker ref={pickerRef}></emoji-picker>;
};

export const EmojiPickerMenu = ({ identity }: { identity?: Identity }) => {
  const { t } = useTranslation('os');
  const value = identity?.profile?.emoji || hexToEmoji(identity?.identityKey.toHex() ?? '0');
  const handleEmojiClick = useCallback((event: EmojiClickEvent) => console.log(event), []);
  return (
    <Popover.Root>
      <ButtonGroup>
        <Popover.Trigger asChild>
          <Button variant='ghost'>
            {value}
            <CaretDown />
          </Button>
        </Popover.Trigger>
        <Button variant='ghost'>{t('clear label')}</Button>
      </ButtonGroup>
      <Popover.Content side='left'>
        <EmojiPicker onEmojiClick={handleEmojiClick} />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};
