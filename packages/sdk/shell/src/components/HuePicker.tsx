//
// Copyright 2024 DXOS.org
//
import { ArrowCounterClockwise, CaretDown, Check } from '@phosphor-icons/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type Dispatch, type SetStateAction } from 'react';

import { Button, useTranslation, Tooltip, DropdownMenu, useThemeContext, type ButtonProps } from '@dxos/react-ui';
import { getSize, hueTokenThemes } from '@dxos/react-ui-theme';

const HuePreview = ({ hue }: { hue: string }) => {
  const { tx } = useThemeContext();
  return (
    <svg width={12} height={12} viewBox='0 0 12 12'>
      <rect x={0} y={0} width={12} height={12} className={tx('hue.fill', 'select--hue__preview', { hue })} />
    </svg>
  );
};

export type HuePickerProps = {
  disabled?: boolean;
  defaultHue?: string;
  hue?: string;
  onChangeHue?: Dispatch<SetStateAction<string>>;
  onClickClear?: ButtonProps['onClick'];
};

export const HuePicker = ({ disabled, hue, onChangeHue, defaultHue, onClickClear }: HuePickerProps) => {
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
