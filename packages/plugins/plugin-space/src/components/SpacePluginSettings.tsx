//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Input, toLocalizedString, useTranslation, List, ListItem, Button } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { SPACE_PLUGIN } from '../meta';
import { SpaceAction, type SpaceSettingsProps } from '../types';
import { getSpaceDisplayName } from '../util';

export const SpacePluginSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const spaces = useSpaces({ all: settings.showHidden });

  return (
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('show hidden spaces label')}>
        <Input.Switch checked={settings.showHidden} onCheckedChange={(checked) => (settings.showHidden = !!checked)} />
      </DeprecatedFormInput>
      <div>
        <h2 className='text-xl my-4'>Space Settings</h2>
        <List classNames='max-w-md mx-auto'>
          {spaces.map((space) => (
            <ListItem.Root key={space.id}>
              <ListItem.Heading classNames='flex flex-col grow truncate mbe-2'>
                {toLocalizedString(getSpaceDisplayName(space, { personal: space === client.spaces.default }), t)}
              </ListItem.Heading>
              <ListItem.Endcap>
                <Button onClick={() => dispatch(createIntent(SpaceAction.OpenSettings, { space }))}>
                  {t('open space settings label')}
                </Button>
              </ListItem.Endcap>
            </ListItem.Root>
          ))}
        </List>
      </div>
    </DeprecatedFormContainer>
  );
};
