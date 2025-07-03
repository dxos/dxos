//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Input, toLocalizedString, useTranslation, List, ListItem, IconButton } from '@dxos/react-ui';
import { controlItemClasses, ControlPage, ControlSection, DeprecatedFormInput } from '@dxos/react-ui-form';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction, type SpaceSettingsProps } from '../types';
import { getSpaceDisplayName } from '../util';

export const SpacePluginSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const spaces = useSpaces({ all: settings.showHidden });
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  // TODO(wittjosiah): Migrate to new form container.
  return (
    <ControlPage>
      <ControlSection title={t('space settings label')} description={t('space settings description')}>
        <div className='pli-trimMd container-max-width'>
          <DeprecatedFormInput label={t('show hidden spaces label')}>
            <Input.Switch
              checked={settings.showHidden}
              onCheckedChange={(checked) => (settings.showHidden = !!checked)}
            />
          </DeprecatedFormInput>
        </div>
        <List classNames={[controlItemClasses, 'flex flex-col gap-trimSm']}>
          {spaces.map((space) => (
            <ListItem.Root key={space.id} classNames='is-full items-center'>
              {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
              <ListItem.Heading classNames='grow truncate !min-bs-0'>
                {toLocalizedString(getSpaceDisplayName(space, { personal: space === client.spaces.default }), t)}
              </ListItem.Heading>
              <IconButton
                icon='ph--faders--regular'
                onClick={() => dispatch(createIntent(SpaceAction.OpenSettings, { space }))}
                label={t('open space settings label')}
              />
            </ListItem.Root>
          ))}
        </List>
      </ControlSection>
    </ControlPage>
  );
};
