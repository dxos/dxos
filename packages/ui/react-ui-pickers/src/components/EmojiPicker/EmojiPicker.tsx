//
// Copyright 2025 DXOS.org
//

import './emoji.css';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { Suspense, lazy, useState } from 'react';

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

/**
 * emoji-mart plus its emoji database is ~480 KB; loading it with the barrel put it in every
 * tab's boot graph, so the panel loads on first open instead.
 */
const EmojiMartPanel = lazy(() => import('./EmojiMartPanel'));

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
          <Suspense fallback={null}>
            <EmojiMartPanel
              onEmojiSelect={({ native }: { native?: string }) => {
                if (native) {
                  setEmojiValue(native);
                  setEmojiPickerOpen(false);
                }
              }}
              themeMode={themeMode}
            />
          </Suspense>
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
          <Button variant={triggerVariant} classNames='grow gap-2 text-2xl' disabled={disabled}>
            <span className='sr-only'>{t('select-emoji.label')}</span>
            <span>{emojiValue}</span>
            <Icon icon='ph--caret-down--bold' size={3} />
          </Button>
        </Popover.Trigger>
        {/* Portalled, like `EmojiPickerToolbarButton` above and `PickerButton` (which is why the hue
            picker never had this problem): rendered in place, a 300px panel is clipped by the first
            scrolling ancestor — in the profile page, the settings panel's own overflow. */}
        <Popover.Portal>
          <Popover.Content
            side='right'
            sideOffset={isMd ? 0 : -310}
            collisionPadding={8}
            onKeyDownCapture={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setEmojiPickerOpen(false);
              }
            }}
          >
            <Suspense fallback={null}>
              <EmojiMartPanel
                onEmojiSelect={({ native }: { native?: string }) => {
                  if (native) {
                    setEmojiValue(native);
                    setEmojiPickerOpen(false);
                  }
                }}
              />
            </Suspense>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
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
