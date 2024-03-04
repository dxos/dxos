//
// Copyright 2024 DXOS.org
//
import 'emoji-picker-element';
import { CaretDown, Check, X } from '@phosphor-icons/react';
import React, { useCallback, useState } from 'react';

import { type Identity } from '@dxos/react-client/halo';
import { Button, useTranslation, Tooltip, DropdownMenu } from '@dxos/react-ui';
import { getSize, hueTokenThemes } from '@dxos/react-ui-theme';
import { hexToHue } from '@dxos/util';

const getHueValue = (identity?: Identity) => identity?.profile?.hue || hexToHue(identity?.identityKey.toHex() ?? '0');

export const HuePicker = ({ identity }: { identity?: Identity }) => {
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
      <Tooltip.Root>
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger asChild>
            <Tooltip.Trigger asChild>
              <Button variant='ghost' classNames='gap-2 plb-1'>
                <span className='sr-only'>{t('select hue label')}</span>
                <span className='grow pis-14'>{t(`${hueValue} label`)}</span>
                <CaretDown className={getSize(4)} />
              </Button>
            </Tooltip.Trigger>
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
                    {t(`${hue} label`)}
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
        <Tooltip.Portal>
          <Tooltip.Content>
            {t('select hue label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Button variant='ghost' onClick={handleClearHueClick}>
        <span className='sr-only'>{t('clear label')}</span>
        <X />
      </Button>
    </>
  );
};
