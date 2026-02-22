//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { IconButton, Input, List, ListItem, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { SpaceOperation, type SpaceSettingsProps } from '../types';
import { getSpaceDisplayName } from '../util';

export type SpacePluginSettingsComponentProps = {
  settings: SpaceSettingsProps;
  onSettingsChange: (fn: (current: SpaceSettingsProps) => SpaceSettingsProps) => void;
};

export const SpacePluginSettings = ({ settings, onSettingsChange }: SpacePluginSettingsComponentProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const spaces = useSpaces({ all: settings.showHidden });
  const { invokePromise } = useOperationInvoker();

  return (
    <Settings.Root>
      <Settings.Section title={t('space settings label')} description={t('space settings description')}>
        <Settings.Group>
          <Settings.ItemInput title={t('show hidden spaces label')}>
            <Input.Switch
              checked={settings.showHidden}
              onCheckedChange={(checked) => onSettingsChange((state) => ({ ...state, showHidden: !!checked }))}
            />
          </Settings.ItemInput>
        </Settings.Group>

        <Settings.Container>
          <List classNames='flex flex-col gap-trimSm'>
            {spaces.map((space) => (
              <ListItem.Root key={space.id} classNames='inline-full items-center'>
                {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
                <ListItem.Heading classNames='grow truncate min-block-0!'>
                  {toLocalizedString(
                    getSpaceDisplayName(space, {
                      personal: space === client.spaces.default,
                    }),
                    t,
                  )}
                </ListItem.Heading>
                <IconButton
                  icon='ph--faders--regular'
                  onClick={() => invokePromise(SpaceOperation.OpenSettings, { space })}
                  label={t('open space settings label')}
                />
              </ListItem.Root>
            ))}
          </List>
        </Settings.Container>
      </Settings.Section>
    </Settings.Root>
  );
};
