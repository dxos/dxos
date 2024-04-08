//
// Copyright 2024 DXOS.org
//
import emojiData from '@emoji-mart/data';
import EmojiMart from '@emoji-mart/react';
import { ArrowCounterClockwise, CaretDown, ImageSquare } from '@phosphor-icons/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type Dispatch, type SetStateAction, useState } from 'react';

import {
  Button,
  Popover,
  useTranslation,
  Tooltip,
  type ButtonProps,
  Toolbar,
  useMediaQuery,
  type ThemedClassName,
} from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

export type EmojiPickerProps = {
  disabled?: boolean;
  defaultEmoji?: string;
  emoji?: string;
  onChangeEmoji?: Dispatch<SetStateAction<string>>;
  onClickClear?: ButtonProps['onClick'];
};

export const EmojiPickerToolbarButton = ({
  disabled,
  defaultEmoji,
  emoji,
  onChangeEmoji,
  classNames,
}: ThemedClassName<Omit<EmojiPickerProps, 'onClickClear'>>) => {
  const { t } = useTranslation('os');
  const [isMd] = useMediaQuery('md', { ssr: false });

  const [_emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  return (
    <Popover.Root open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
      <Popover.Trigger asChild>
        <Toolbar.Button asChild>
          <Button classNames={['gap-2 text-2xl plb-1', classNames]} disabled={disabled}>
            <span className='sr-only'>{t('select emoji label')}</span>
            <ImageSquare />
          </Button>
        </Toolbar.Button>
      </Popover.Trigger>
      <Popover.Content
        side='bottom'
        sideOffset={isMd ? 0 : -310}
        onKeyDownCapture={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            setEmojiPickerOpen(false);
          }
        }}
      >
        <EmojiMart
          data={emojiData}
          onEmojiSelect={({ native }: { native?: string }) => {
            if (native) {
              setEmojiValue(native);
              setEmojiPickerOpen(false);
            }
          }}
          autoFocus={true}
          maxFrequentRows={0}
          noCountryFlags={true}
        />
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};

export const EmojiPickerBlock = ({ disabled, defaultEmoji, emoji, onChangeEmoji, onClickClear }: EmojiPickerProps) => {
  const { t } = useTranslation('os');
  const [isMd] = useMediaQuery('md', { ssr: false });

  const [emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  return (
    <>
      <Popover.Root open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <Popover.Trigger asChild>
          <Button variant='ghost' classNames='gap-2 text-2xl plb-1' disabled={disabled}>
            <span className='sr-only'>{t('select emoji label')}</span>
            <span className='grow pis-14'>{emojiValue}</span>
            <CaretDown className={getSize(4)} />
          </Button>
        </Popover.Trigger>
        <Popover.Content
          side='right'
          sideOffset={isMd ? 0 : -310}
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setEmojiPickerOpen(false);
            }
          }}
        >
          <EmojiMart
            data={emojiData}
            onEmojiSelect={({ native }: { native?: string }) => {
              if (native) {
                setEmojiValue(native);
                setEmojiPickerOpen(false);
              }
            }}
            autoFocus={true}
            maxFrequentRows={0}
            noCountryFlags={true}
          />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Root>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button variant='ghost' onClick={onClickClear} disabled={disabled}>
            <span className='sr-only'>{t('clear label')}</span>
            <ArrowCounterClockwise />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content style={{ zIndex: 70 }} side='right'>
            {t('clear label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </>
  );
};
