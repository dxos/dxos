//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Input, toLocalizedString, useTranslation, List, ListItem, IconButton } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

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
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('show hidden spaces label')}>
        <Input.Switch checked={settings.showHidden} onCheckedChange={(checked) => (settings.showHidden = !!checked)} />
      </DeprecatedFormInput>
      <div role='none'>
        <h2 className='text-xl my-4'>{t('space settings label')}</h2>
        {/* TODO(burdon): Consider fragment for a callout border section. */}
        <div className='-mis-4 -mie-4 p-4 border border-separator rounded-md'>
          <List classNames='flex flex-col gap-2'>
            {spaces.map((space) => (
              <ListItem.Root key={space.id} classNames='items-center gap-4'>
                {/* TODO(burdon): Should auto center and truncate; NOTE truncate doesn't work with flex grow. */}
                <ListItem.Heading classNames='flex w-full items-center truncate'>
                  {toLocalizedString(getSpaceDisplayName(space, { personal: space === client.spaces.default }), t)}
                </ListItem.Heading>
                <ListItem.Endcap>
                  <IconButton
                    icon='ph--faders--regular'
                    iconOnly
                    onClick={() => dispatch(createIntent(SpaceAction.OpenSettings, { space }))}
                    label={t('open space settings label')}
                  />
                </ListItem.Endcap>
              </ListItem.Root>
            ))}
          </List>
        </div>
      </div>
    </DeprecatedFormContainer>
  );
};
