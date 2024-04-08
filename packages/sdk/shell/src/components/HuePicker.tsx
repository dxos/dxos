//
// Copyright 2024 DXOS.org
//
import { ArrowCounterClockwise, CaretDown, Check, PaintBrush } from '@phosphor-icons/react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type Dispatch, type SetStateAction, useRef, useState } from 'react';

import {
  Button,
  useTranslation,
  Tooltip,
  DropdownMenu,
  useThemeContext,
  type ButtonProps,
  Toolbar,
  type ThemedClassName,
} from '@dxos/react-ui';
import { getSize, hueTokenThemes, mx } from '@dxos/react-ui-theme';

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
              <PaintBrush className={getSize(5)} />
            </Toolbar.Button>
          </DropdownMenu.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side='bottom'>
            {t('select hue label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
        <DropdownMenu.Content side='bottom'>
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
    </Tooltip.Root>
  );
};

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
