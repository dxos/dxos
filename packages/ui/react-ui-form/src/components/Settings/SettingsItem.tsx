//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Input, type Label, type ThemedClassName, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

const SETTINGS_PANEL_NAME = 'Settings.Panel';
const SETTINGS_ITEM_NAME = 'Settings.Item';

//
// Panel (bordered card container).
//

type SettingsPanelProps = ThemedClassName<PropsWithChildren>;

export const SettingsPanel = ({ classNames, children }: SettingsPanelProps) => {
  return (
    <div role='none' className={mx('flex flex-col gap-3 p-trim-md border border-separator rounded-sm', classNames)}>
      {children}
    </div>
  );
};

SettingsPanel.displayName = SETTINGS_PANEL_NAME;

//
// Item (label + optional description + control, proper label semantics).
//

type SettingsItemProps = PropsWithChildren<{
  title: Label;
  description?: Label;
}>;

export const SettingsItem = ({ title, description = '', children }: SettingsItemProps) => {
  const { t } = useTranslation(translationKey);

  return (
    <Input.Root>
      <SettingsPanel classNames='grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-x-trim-lg gap-y-0'>
        <Input.Label classNames='pb-trim-md text-base-surface-text text-lg md:col-span-2'>
          {toLocalizedString(title, t)}
        </Input.Label>
        <Input.DescriptionAndValidation>
          <Input.Description classNames='text-base text-description'>
            {toLocalizedString(description, t)}
          </Input.Description>
        </Input.DescriptionAndValidation>
        <div role='none' className='text-end py-1'>
          {children}
        </div>
      </SettingsPanel>
    </Input.Root>
  );
};

SettingsItem.displayName = SETTINGS_ITEM_NAME;
