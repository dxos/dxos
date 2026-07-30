//
// Copyright 2025 DXOS.org
//

import './emoji.css';

import emojiData from '@emoji-mart/data';
import EmojiMart from '@emoji-mart/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { useState } from 'react';

import {
  Button,
  ButtonGroup,
  type ButtonProps,
  Icon,
  IconButton,
  Popover,
  type ThemedClassName,
  Toolbar,
  useMediaQuery,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

export type EmojiPickerContentProps = {
  /** Invoked with the picked emoji's native character. */
  onSelect: (emoji: string) => void;
};

/**
 * The emoji grid itself, without any trigger or surface of its own. Exported so a caller that owns its
 * own popover (a message's reaction picker) shows the same picker as the components below rather than
 * wiring emoji-mart a second time.
 */
export const EmojiPickerContent = ({ onSelect }: EmojiPickerContentProps) => {
  const { themeMode } = useThemeContext();
  return (
    // https://github.com/missive/emoji-mart?tab=readme-ov-file#options--props
    <EmojiMart
      data={emojiData}
      onEmojiSelect={({ native }: { native?: string }) => {
        if (native) {
          onSelect(native);
        }
      }}
      autoFocus={true}
      maxFrequentRows={0}
      noCountryFlags={true}
      theme={themeMode}
    />
  );
};

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
  const { t } = useTranslation(osTranslations);
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
      <Popover.Trigger asChild>
        <Toolbar.IconButton
          icon='ph--user-circle--regular'
          label={t('select-emoji.label')}
          iconOnly
          tooltipSide='bottom'
          disabled={disabled}
        />
      </Popover.Trigger>
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
          <EmojiPickerContent
            onSelect={(emoji) => {
              setEmojiValue(emoji);
              setEmojiPickerOpen(false);
            }}
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
  const { t } = useTranslation(osTranslations);
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
          <Button variant={triggerVariant} classNames='grow gap-2 text-2xl py-1' disabled={disabled}>
            <span className='sr-only'>{t('select-emoji.label')}</span>
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
          <EmojiPickerContent
            onSelect={(emoji) => {
              setEmojiValue(emoji);
              setEmojiPickerOpen(false);
            }}
          />
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Root>
      <IconButton
        icon='ph--arrow-counter-clockwise--regular'
        iconOnly
        label={t('clear.label')}
        tooltipSide='right'
        variant={triggerVariant}
        onClick={onClickClear}
        disabled={disabled}
      />
    </ButtonGroup>
  );
};
