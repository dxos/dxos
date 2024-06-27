//
// Copyright 2024 DXOS.org
//

import { ArrowCounterClockwise, CaretDown, Check, Palette } from '@phosphor-icons/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { useRef, useState } from 'react';

import {
  Button,
  type ButtonProps,
  DropdownMenu,
  type ThemedClassName,
  Toolbar,
  Tooltip,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { getSize, hueTokenThemes, mx } from '@dxos/react-ui-theme';

const HuePreview = ({ hue }: { hue: string }) => {
  const { tx } = useThemeContext();
  const size = 20;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect x={0} y={0} width={size} height={size} className={tx('hue.fill', 'select--hue__preview', { hue })} />
    </svg>
  );
};

const hueTokens = Object.keys(hueTokenThemes).slice(0, 16);

export type HuePickerProps = {
  disabled?: boolean;
  defaultHue?: string;
  hue?: string;
  onChangeHue?: (nextHue: string) => void;
  onClickClear?: ButtonProps['onClick'];
};

/**
 * A toolbar button for picking hue. Use only in `role=toolbar` elements. Unable to unset the value.
 */
export const HuePickerToolbarButton = ({
  disabled,
  hue,
  onChangeHue,
  classNames,
  defaultHue,
}: ThemedClassName<Omit<HuePickerProps, 'onClickClear'>>) => {
  const { t } = useTranslation('os');

  const [hueValue, setHueValue] = useControllableState<string>({
    prop: hue,
    onChange: onChangeHue,
    defaultProp: defaultHue,
  });

  const [huePickerOpen, setHuePickerOpen] = useState<boolean>(false);

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
      <DropdownMenu.Root
        modal={false}
        open={huePickerOpen}
        onOpenChange={(nextOpen) => {
          setHuePickerOpen(nextOpen);
          suppressNextTooltip.current = true;
        }}
      >
        <Tooltip.Trigger asChild>
          <DropdownMenu.Trigger asChild>
            <Toolbar.Button classNames={mx('gap-2 plb-1', classNames)} disabled={disabled}>
              <span className='sr-only'>{t('select hue label')}</span>
              <Palette className={getSize(5)} />
            </Toolbar.Button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side='bottom' classNames='z-50'>
            {t('select hue label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
        {/* TODO(burdon): Change from DropdownMenu (show checked). */}
        <DropdownMenu.Content side='bottom' classNames='!w-40'>
          <DropdownMenu.Viewport classNames='grid grid-cols-4'>
            {hueTokens.map((hue) => {
              return (
                <DropdownMenu.CheckboxItem
                  key={hue}
                  checked={hue === hueValue}
                  onCheckedChange={() => setHueValue(hue)}
                  classNames={'px-0 py-2 items-center justify-center'}
                >
                  <HuePreview hue={hue} />
                </DropdownMenu.CheckboxItem>
              );
            })}
          </DropdownMenu.Viewport>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Tooltip.Root>
  );
};

/**
 * A button for picking hue alongside a button for unsetting it.
 */
export const HuePickerBlock = ({ disabled, hue, onChangeHue, defaultHue, onClickClear }: HuePickerProps) => {
  const { t } = useTranslation('os');

  const [hueValue, setHueValue] = useControllableState<string>({
    prop: hue,
    onChange: onChangeHue,
    defaultProp: defaultHue,
  });

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <Button variant='ghost' classNames='gap-2 plb-1' disabled={disabled}>
            <span className='sr-only'>{t('select hue label')}</span>
            <div role='none' className='pis-14 grow flex items-center justify-center gap-2'>
              <HuePreview hue={hueValue!} />
              <span>{t(`${hueValue} label`)}</span>
            </div>
            <CaretDown className={getSize(4)} />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content side='right'>
          <DropdownMenu.Viewport>
            {Object.keys(hueTokenThemes).map((hue) => {
              return (
                <DropdownMenu.CheckboxItem
                  key={hue}
                  checked={hue === hueValue}
                  onCheckedChange={() => setHueValue(hue)}
                >
                  <HuePreview hue={hue} />
                  <span className='grow'>{t(`${hue} label`)}</span>
                  <DropdownMenu.ItemIndicator>
                    <Check />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.CheckboxItem>
              );
            })}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Root>
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
