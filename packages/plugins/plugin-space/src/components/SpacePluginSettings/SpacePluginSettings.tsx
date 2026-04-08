//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface, isPersonalSpace } from '@dxos/app-toolkit';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, Input, List, ListItem, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Settings as SettingsForm } from '@dxos/react-ui-form';

import { meta } from '#meta';
import { type Settings } from '#types';
import { getSpaceDisplayName } from '../../util';

export type SpacePluginSettingsProps = AppSurface.SettingsProps<
  Settings.Settings,
  {
    spaces?: Space[];
    onOpenSpaceSettings?: (space: Space) => void;
  }
>;

export const SpacePluginSettings = ({
  settings,
  onSettingsChange,
  spaces,
  onOpenSpaceSettings,
}: SpacePluginSettingsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <SettingsForm.Viewport>
      <SettingsForm.Section title={t('space-settings.label')} description={t('space-settings.description')}>
        <SettingsForm.Item title={t('show-hidden-spaces.label')} description={t('show-hidden-spaces.description')}>
          <Input.Switch
            disabled={!onSettingsChange}
            checked={settings.showHidden}
            onCheckedChange={(checked) => onSettingsChange?.((state) => ({ ...state, showHidden: !!checked }))}
          />
        </SettingsForm.Item>

        <SettingsForm.Panel>
          <Input.Root>
            <Input.Label>{t('settings.space-list.label')}</Input.Label>
          </Input.Root>
          <List classNames='flex flex-col gap-trim-sm'>
            {spaces?.map((space) => (
              <ListItem.Root key={space.id} classNames='w-full items-center'>
                {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
                <ListItem.Heading classNames='grow truncate min-h-0!'>
                  {toLocalizedString(
                    getSpaceDisplayName(space, {
                      personal: isPersonalSpace(space),
                    }),
                    t,
                  )}
                </ListItem.Heading>
                <IconButton
                  icon='ph--faders--regular'
                  label={t('settings.open-settings.label')}
                  disabled={!!onOpenSpaceSettings}
                  onClick={() => onOpenSpaceSettings?.(space)}
                />
              </ListItem.Root>
            ))}
          </List>
        </SettingsForm.Panel>
      </SettingsForm.Section>
    </SettingsForm.Viewport>
  );
};
