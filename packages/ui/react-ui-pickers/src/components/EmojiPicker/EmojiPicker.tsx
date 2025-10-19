//
// Copyright 2025 DXOS.org
//

import emojiData from '@emoji-mart/data';
import EmojiMart from '@emoji-mart/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { useState } from 'react';

import {
  Button,
  ButtonGroup,
  type ButtonProps,
  Icon,
  Popover,
  type ThemedClassName,
  Toolbar,
  Tooltip,
  useMediaQuery,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';

import './emoji.css';

export type EmojiPickerProps = ThemedClassName<{
  disabled?: boolean;
  defaultEmoji?: string;
  emoji?: string;
  onChangeEmoji?: (nextEmoji: string) => void;
  onClickClear?: ButtonProps['onClick'];
  triggerVariant?: ButtonProps['variant'];
}>;

/**
 * A toolbar button for picking an emoji. Use only in `role=toolbar` elements. Unable to unset the value.
 */
export const EmojiPickerToolbarButton = ({
  classNames,
  emoji,
  disabled,
  defaultEmoji,
  onChangeEmoji,
}: Omit<EmojiPickerProps, 'onClickClear'>) => {
  const { t } = useTranslation('os');
  const { themeMode } = useThemeContext();

  const [_emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  return (
    <Popover.Root
      open={emojiPickerOpen}
      onOpenChange={(nextOpen) => {
        setEmojiPickerOpen(nextOpen);
      }}
    >
      <Tooltip.Trigger asChild content={t('select emoji label')} side='bottom'>
        <Popover.Trigger asChild>
          <Toolbar.Button classNames={['gap-2 text-2xl plb-1', classNames]} disabled={disabled}>
            <span className='sr-only'>{t('select emoji label')}</span>
            <Icon icon='ph--user-circle--regular' size={5} />
          </Toolbar.Button>
        </Popover.Trigger>
      </Tooltip.Trigger>
      <Popover.Portal>
        <Popover.Content
          side='bottom'
          onKeyDownCapture={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setEmojiPickerOpen(false);
            }
          }}
        >
          {/* https://github.com/missive/emoji-mart?tab=readme-ov-file#options--props */}
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
            theme={themeMode}
          />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

/**
 * A button for picking an emoji alongside a button for unsetting it.
 */
export const EmojiPickerBlock = ({
  disabled,
  defaultEmoji,
  emoji,
  onChangeEmoji,
  onClickClear,
  triggerVariant = 'ghost',
  classNames,
}: EmojiPickerProps) => {
  const { t } = useTranslation('os');
  const [isMd] = useMediaQuery('md');

  const [emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  return (
    <ButtonGroup classNames={classNames}>
      <Popover.Root open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <Popover.Trigger asChild>
          <Button variant={triggerVariant} classNames='grow gap-2 text-2xl plb-1' disabled={disabled}>
            <span className='sr-only'>{t('select emoji label')}</span>
            <span>{emojiValue}</span>
            <Icon icon='ph--caret-down--bold' size={3} />
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
      <Tooltip.Trigger asChild content={t('clear label')} side='right'>
        <Button variant={triggerVariant} onClick={onClickClear} disabled={disabled}>
          <span className='sr-only'>{t('clear label')}</span>
          <Icon icon='ph--arrow-counter-clockwise--regular' size={5} />
        </Button>
      </Tooltip.Trigger>
    </ButtonGroup>
  );
};
