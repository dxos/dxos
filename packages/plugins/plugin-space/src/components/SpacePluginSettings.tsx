//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useOperationInvoker } from '@dxos/app-framework/react';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { IconButton, Input, List, ListItem, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { ControlGroup, ControlItemInput, ControlPage, ControlSection, controlItemClasses } from '@dxos/react-ui-form';

import { meta } from '../meta';
import { SpaceOperation, type SpaceSettingsProps } from '../types';
import { getSpaceDisplayName } from '../util';

export const SpacePluginSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const spaces = useSpaces({ all: settings.showHidden });
  const { invokePromise } = useOperationInvoker();

  return (
    <ControlPage>
      <ControlSection title={t('space settings label')} description={t('space settings description')}>
        <ControlGroup>
          <ControlItemInput title={t('show hidden spaces label')}>
            <Input.Switch
              checked={settings.showHidden}
              onCheckedChange={(checked) => (settings.showHidden = !!checked)}
            />
          </ControlItemInput>
        </ControlGroup>
        <List classNames={[controlItemClasses, 'flex flex-col gap-trimSm']}>
          {spaces.map((space) => (
            <ListItem.Root key={space.id} classNames='is-full items-center'>
              {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
              <ListItem.Heading classNames='grow truncate !min-bs-0'>
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
      </ControlSection>
    </ControlPage>
  );
};
