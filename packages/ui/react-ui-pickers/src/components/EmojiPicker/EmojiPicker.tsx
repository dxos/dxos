//
// Copyright 2025 DXOS.org
//

import './emoji.css';

import React, { Suspense, lazy, useState } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Popover from '@dxos/react-ui/Popover';
import type * as Util from '@dxos/react-ui/Util';
import { osTranslations } from '@dxos/ui-theme';

/**
 * emoji-mart plus its emoji database is ~480 KB; loading it with the barrel put it in every
 * tab's boot graph, so the panel loads on first open instead.
 */
const EmojiMartPanel = lazy(() => import('./EmojiMartPanel.tsx'));

export type EmojiPickerProps = Util.ThemedClassName<{
  disabled?: boolean;
  size?: Button.RootProps['size'];
  defaultEmoji?: string;
  emoji?: string;
  onChangeEmoji?: (nextEmoji: string) => void;
  onClickClear?: Button.RootProps['onClick'];
  triggerVariant?: Button.RootProps['variant'];
}>;

/**
 * A toolbar button for picking an emoji. Use only in `role=toolbar` elements. Unable to unset the value.
 */
export const EmojiPickerToolbarButton = ({
  size,
  emoji,
  disabled,
  defaultEmoji,
  onChangeEmoji,
}: Omit<EmojiPickerProps, 'onClickClear'>) => {
  const { t } = Hooks.useTranslation(osTranslations);
  const themeMode = Hooks.useThemeMode();

  const [_emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  return (
    <Popover.Root
      open={emojiPickerOpen}
      onOpenChange={({ open: nextOpen }) => {
        setEmojiPickerOpen(nextOpen);
      }}
      positioning={{ placement: 'bottom' }}
    >
      <Popover.Trigger asChild>
        <Button.Root
          size={size}
          label={t('select-emoji.label')}
          icon='ph--smiley--regular'
          iconOnly
          tooltipSide='bottom'
          disabled={disabled}
        />
      </Popover.Trigger>
      <Popover.Content
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
      </Popover.Content>
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
  const { t } = Hooks.useTranslation(osTranslations);
  const [isMd] = Hooks.useMediaQuery('md');

  const [emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  return (
    <Button.Group classNames={classNames}>
      <Popover.Root
        open={emojiPickerOpen}
        onOpenChange={({ open }) => setEmojiPickerOpen(open)}
        positioning={{ placement: 'right', gutter: isMd ? 0 : -310, overflowPadding: 8 }}
      >
        <Popover.Trigger asChild>
          <Button.Root variant={triggerVariant} classNames='text-xl' disabled={disabled}>
            <span className='sr-only'>{t('select-emoji.label')}</span>
            <span>{emojiValue}</span>
            <Icon.Icon icon='ph--caret-down--bold' size='xs' />
          </Button.Root>
        </Popover.Trigger>
        {/* Portalled, like `EmojiPickerToolbarButton` above and `PickerButton` (which is why the hue
            picker never had this problem): rendered in place, a 300px panel is clipped by the first
            scrolling ancestor — in the profile page, the settings panel's own overflow. */}
        <Popover.Content
          classNames='p-0'
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
        </Popover.Content>
      </Popover.Root>
      <Button.Root
        icon='ph--arrow-counter-clockwise--regular'
        iconOnly
        label={t('clear.label')}
        tooltipSide='right'
        variant={triggerVariant}
        onClick={onClickClear}
        disabled={disabled}
      />
    </Button.Group>
  );
};
