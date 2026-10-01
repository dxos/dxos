//
// Copyright 2025 DXOS.org
//

import './emoji.css';

import React, { Suspense, lazy, useState } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import { type ThemedClassName, useMediaQuery, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { osTranslations } from '@dxos/ui-theme';

/**
 * emoji-mart plus its emoji database is ~480 KB; loading it with the barrel put it in every
 * tab's boot graph, so the panel loads on first open instead.
 */
const EmojiMartPanel = lazy(() => import('./EmojiMartPanel.tsx'));

export type EmojiPickerProps = ThemedClassName<{
  disabled?: boolean;
  size?: Next.ButtonProps['size'];
  defaultEmoji?: string;
  emoji?: string;
  onChangeEmoji?: (nextEmoji: string) => void;
  onClickClear?: Next.ButtonProps['onClick'];
  triggerVariant?: Next.ButtonProps['variant'];
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
  const { t } = useTranslation(osTranslations);
  const themeMode = Next.useThemeMode();

  const [_emojiValue, setEmojiValue] = useControllableState<string>({
    prop: emoji,
    onChange: onChangeEmoji,
    defaultProp: defaultEmoji,
  });

  const [emojiPickerOpen, setEmojiPickerOpen] = useState<boolean>(false);

  return (
    <Next.Popover.Root
      open={emojiPickerOpen}
      onOpenChange={(nextOpen) => {
        setEmojiPickerOpen(nextOpen);
      }}
    >
      <Next.Popover.Trigger asChild>
        <Next.Button
          size={size}
          label={t('select-emoji.label')}
          icon='ph--smiley--regular'
          iconOnly
          tooltipSide='bottom'
          disabled={disabled}
        />
      </Next.Popover.Trigger>
      <Next.Popover.Content
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
      </Next.Popover.Content>
    </Next.Popover.Root>
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
    <Next.Group classNames={classNames}>
      <Next.Popover.Root open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
        <Next.Popover.Trigger asChild>
          <Next.Button variant={triggerVariant} classNames='grow gap-2 text-2xl' disabled={disabled}>
            <span className='sr-only'>{t('select-emoji.label')}</span>
            <span>{emojiValue}</span>
            <Next.Icon icon='ph--caret-down--bold' size='xs' classNames='mx-0.5' />
          </Next.Button>
        </Next.Popover.Trigger>
        {/* Portalled, like `EmojiPickerToolbarButton` above and `PickerButton` (which is why the hue
            picker never had this problem): rendered in place, a 300px panel is clipped by the first
            scrolling ancestor — in the profile page, the settings panel's own overflow. */}
        <Next.Popover.Content
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
        </Next.Popover.Content>
      </Next.Popover.Root>
      <Next.Button
        icon='ph--arrow-counter-clockwise--regular'
        iconOnly
        label={t('clear.label')}
        tooltipSide='right'
        variant={triggerVariant}
        onClick={onClickClear}
        disabled={disabled}
      />
    </Next.Group>
  );
};
