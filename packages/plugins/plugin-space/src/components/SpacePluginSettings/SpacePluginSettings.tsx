//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { isPersonalSpace } from '@dxos/app-toolkit';
import { type SettingsSurfaceProps } from '@dxos/app-toolkit/ui';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, Input, List, ListItem, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../../meta';
import { type SpaceSettingsProps } from '../../types';
import { getSpaceDisplayName } from '../../util';

export type SpacePluginSettingsComponentProps = SettingsSurfaceProps<SpaceSettingsProps> & {
  spaces?: Space[];
  onOpenSpaceSettings?: (space: Space) => void;
};

export const SpacePluginSettings = ({
  settings,
  onSettingsChange,
  spaces,
  onOpenSpaceSettings,
}: SpacePluginSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Settings.Root>
      <Settings.Section title={t('space-settings.label')} description={t('space-settings.description')}>
        <Settings.Group>
          <Settings.ItemInput title={t('show-hidden-spaces.label')}>
            <Input.Switch
              disabled={!onSettingsChange}
              checked={settings.showHidden}
              onCheckedChange={(checked) => onSettingsChange?.((state) => ({ ...state, showHidden: !!checked }))}
            />
          </Settings.ItemInput>
        </Settings.Group>

        <Settings.Container>
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
                  onClick={() => onOpenSpaceSettings?.(space)}
                  label={t('open-space-settings.label')}
                />
              </ListItem.Root>
            ))}
          </List>
        </Settings.Container>
      </Settings.Section>
    </Settings.Root>
  );
};
