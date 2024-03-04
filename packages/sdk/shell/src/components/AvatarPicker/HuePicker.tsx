//
// Copyright 2024 DXOS.org
//
import { ArrowCounterClockwise, CaretDown, Check } from '@phosphor-icons/react';
import React, { useCallback, useState } from 'react';

import { type Identity } from '@dxos/react-client/halo';
import { Button, useTranslation, Tooltip, DropdownMenu, useThemeContext } from '@dxos/react-ui';
import { getSize, hueTokenThemes } from '@dxos/react-ui-theme';
import { hexToHue } from '@dxos/util';

const getHueValue = (identity?: Identity) => identity?.profile?.hue || hexToHue(identity?.identityKey.toHex() ?? '0');

const HuePreview = ({ hue }: { hue: string }) => {
  const { tx } = useThemeContext();
  return (
    <svg width={12} height={12} viewBox='0 0 12 12'>
      <rect x={0} y={0} width={12} height={12} className={tx('hue.fill', 'select--hue__preview', { hue })} />
    </svg>
  );
};

export const HuePicker = ({ identity, disabled }: { identity?: Identity; disabled?: boolean }) => {
  const { t } = useTranslation('os');

  const [hueValue, setHueValue] = useState<string>(getHueValue(identity));

  const handleHueClick = useCallback(
    (hue: string) => {
      if (identity?.profile) {
        identity.profile.hue = hue;
        setHueValue(hue);
      }
    },
    [identity],
  );
  const handleClearHueClick = useCallback(() => {
    if (identity?.profile) {
      identity.profile.hue = undefined;
    }
    setHueValue(getHueValue(identity));
  }, [identity]);

  // @ts-ignore
  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <Button variant='ghost' classNames='gap-2 plb-1' disabled={disabled}>
            <span className='sr-only'>{t('select hue label')}</span>
            <div role='none' className='pis-14 grow flex items-center justify-center gap-2'>
              <HuePreview hue={hueValue} />
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
                  onCheckedChange={() => handleHueClick(hue)}
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
          <Button variant='ghost' onClick={handleClearHueClick} disabled={disabled}>
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
