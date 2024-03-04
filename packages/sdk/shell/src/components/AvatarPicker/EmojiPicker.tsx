//
// Copyright 2024 DXOS.org
//
import emojiData from '@emoji-mart/data';
import EmojiMart from '@emoji-mart/react';
import { useModalAttributes } from '@fluentui/react-tabster';
import { CaretDown, X } from '@phosphor-icons/react';
import React, { useCallback, useState } from 'react';

import { type Identity } from '@dxos/react-client/halo';
import { Button, Popover, useTranslation, Tooltip, useThemeContext } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { hexToEmoji } from '@dxos/util';

const getEmojiValue = (identity?: Identity) =>
  identity?.profile?.emoji || hexToEmoji(identity?.identityKey.toHex() ?? '0');

export const EmojiPicker = ({ identity }: { identity?: Identity }) => {
  const { t } = useTranslation('os');

  const [emojiValue, setEmojiValue] = useState<string>(getEmojiValue(identity));
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);
  const { modalAttributes, triggerAttributes } = useModalAttributes({ trapFocus: true });
  const { themeMode } = useThemeContext();

  const handleEmojiSelect = useCallback(
    ({ native }: { native?: string }) => {
      if (identity?.profile && native) {
        identity.profile.emoji = native;
        setEmojiValue(native);
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

  // @ts-ignore
  return (
    <>
      <Tooltip.Root>
        <Popover.Root open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <Popover.Trigger asChild>
            <Tooltip.Trigger asChild>
              <Button variant='ghost' classNames='gap-2 text-2xl plb-1' {...triggerAttributes}>
                <span className='sr-only'>{t('select emoji label')}</span>
                <span className='grow pis-14'>{emojiValue}</span>
                <CaretDown className={getSize(4)} />
              </Button>
            </Tooltip.Trigger>
          </Popover.Trigger>
          <Popover.Content
            side='right'
            onKeyDownCapture={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setEmojiPickerOpen(false);
              }
            }}
            {...modalAttributes}
          >
            <EmojiMart
              data={emojiData}
              onEmojiSelect={handleEmojiSelect}
              autoFocus={true}
              maxFrequentRows={0}
              noCountryFlags={true}
            />
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
