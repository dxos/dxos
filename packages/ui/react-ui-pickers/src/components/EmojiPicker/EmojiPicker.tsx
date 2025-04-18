//
// Copyright 2025 DXOS.org
//

import emojiData from '@emoji-mart/data';
import EmojiMart from '@emoji-mart/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { useRef, useState } from 'react';

import {
  Button,
  type ButtonProps,
  Popover,
  type ThemedClassName,
  Toolbar,
  Tooltip,
  useMediaQuery,
  useThemeContext,
  useTranslation,
  Icon,
  ButtonGroup,
} from '@dxos/react-ui';

import './emoji.css';

export type EmojiPickerProps = {
  disabled?: boolean;
  defaultEmoji?: string;
  emoji?: string;
  onChangeEmoji?: (nextEmoji: string) => void;
  onClickClear?: ButtonProps['onClick'];
  triggerVariant?: ButtonProps['variant'];
};

/**
 * A toolbar button for picking an emoji. Use only in `role=toolbar` elements. Unable to unset the value.
 */
export const EmojiPickerToolbarButton = ({
  classNames,
  emoji,
  disabled,
  defaultEmoji,
  onChangeEmoji,
}: ThemedClassName<Omit<EmojiPickerProps, 'onClickClear'>>) => {
  const { t } = useTranslation('os');
  const { themeMode } = useThemeContext();

  const [_emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);
  const suppressNextTooltip = useRef<boolean>(false);
  const [triggerTooltipOpen, setTriggerTooltipOpen] = useState(false);

  return (
    <Tooltip.Root
      open={triggerTooltipOpen}
      onOpenChange={(nextOpen) => {
        if (suppressNextTooltip.current) {
          setTriggerTooltipOpen(false);
          suppressNextTooltip.current = false;
        } else {
          setTriggerTooltipOpen(nextOpen);
        }
      }}
    >
      <Popover.Root
        open={emojiPickerOpen}
        onOpenChange={(nextOpen) => {
          setEmojiPickerOpen(nextOpen);
          suppressNextTooltip.current = true;
        }}
      >
        <Tooltip.Trigger asChild>
          <Popover.Trigger asChild>
            <Toolbar.Button classNames={['gap-2 text-2xl plb-1', classNames]} disabled={disabled}>
              <span className='sr-only'>{t('select emoji label')}</span>
              <Icon icon='ph--user-circle--regular' size={5} />
            </Toolbar.Button>
          </Popover.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side='bottom'>
            {t('select emoji label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
        <Popover.Portal>
          <Popover.Content
            side='bottom'
            onKeyDownCapture={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setEmojiPickerOpen(false);
                suppressNextTooltip.current = true;
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
    </Tooltip.Root>
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
}: EmojiPickerProps) => {
  const { t } = useTranslation('os');
  const [isMd] = useMediaQuery('md', { ssr: false });

  const [emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  return (
    <ButtonGroup>
      <Popover.Root open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <Popover.Trigger asChild>
          <Button variant={triggerVariant} classNames='gap-2 text-2xl plb-1' disabled={disabled}>
            <span className='sr-only'>{t('select emoji label')}</span>
            <span className='grow'>{emojiValue}</span>
            <Icon icon='ph--caret-down--regular' size={4} />
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
          <Button variant={triggerVariant} onClick={onClickClear} disabled={disabled}>
            <span className='sr-only'>{t('clear label')}</span>
            <Icon icon='ph--arrow-counter-clockwise--regular' size={5} />
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side='right'>
            {t('clear label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </ButtonGroup>
  );
};
