//
// Copyright 2024 DXOS.org
//
import 'emoji-picker-element';
import { CaretDown, X } from '@phosphor-icons/react';
import { type Picker } from 'emoji-picker-element';
import { type EmojiClickEvent } from 'emoji-picker-element/shared';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Identity } from '@dxos/react-client/halo';
import { Button, Popover, useTranslation, Tooltip } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { hexToEmoji } from '@dxos/util';

export type EmojiPickerProps = { onEmojiClick: (event: EmojiClickEvent) => void };

const getEmojiValue = (identity?: Identity) =>
  identity?.profile?.emoji || hexToEmoji(identity?.identityKey.toHex() ?? '0');

export const EmojiPicker = ({ identity }: { identity?: Identity }) => {
  const { t } = useTranslation('os');

  const [emojiValue, setEmojiValue] = useState<string>(getEmojiValue(identity));
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  const pickerRef = useRef<Picker | null>(null);
  const handleEmojiClick = useCallback(
    (event: EmojiClickEvent) => {
      if (identity?.profile && event.detail.unicode) {
        identity.profile.emoji = event.detail.unicode;
        setEmojiValue(event.detail.unicode);
      }
    },
    [identity],
  );
  const handleClearEmojiClick = useCallback(() => {
    if (identity?.profile) {
      identity.profile.emoji = undefined;
    }
    setEmojiValue(getEmojiValue(identity));
  }, [identity]);

  useEffect(() => {
    if (emojiPickerOpen) {
      setTimeout(() => {
        // TODO(thure): There seems to be a race condition to bind handlers — a normal effect doesn’t work in this case
        //   because Popover.Content isn’t mounted, nor can we use `forceMount` here (afaik). Would prefer a regular
        //   `on{Event}` prop, but it’s not clear how that is supposed to work.
        pickerRef.current?.addEventListener('emoji-click', handleEmojiClick);
      }, 0);
    }
  }, [emojiPickerOpen]);

  // @ts-ignore
  return (
    <>
      <Tooltip.Root>
        <Popover.Root open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <Popover.Trigger asChild>
            <Tooltip.Trigger asChild>
              <Button variant='ghost' classNames='gap-2 text-2xl plb-1'>
                <span className='sr-only'>{t('select emoji label')}</span>
                <span className='grow pis-14'>{emojiValue}</span>
                <CaretDown className={getSize(4)} />
              </Button>
            </Tooltip.Trigger>
          </Popover.Trigger>
          <Popover.Content
            side='right'
            classNames='overflow-hidden overscroll-contain'
            onOpenAutoFocus={() => pickerRef.current?.shadowRoot?.querySelector('input')?.focus()}
            onKeyDownCapture={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setEmojiPickerOpen(false);
              }
            }}
          >
            <emoji-picker ref={pickerRef} />
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>
        <Tooltip.Portal>
          <Tooltip.Content>
            {t('select emoji label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Button variant='ghost' onClick={handleClearEmojiClick}>
        <span className='sr-only'>{t('clear label')}</span>
        <X />
      </Button>
    </>
  );
};
