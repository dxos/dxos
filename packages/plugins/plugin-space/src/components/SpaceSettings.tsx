//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useIntentDispatcher, useResolvePlugins } from '@dxos/app-framework';
import { SettingsValue } from '@dxos/plugin-settings';
import { Input, Select, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { SpaceAction, SPACE_PLUGIN } from '../meta';
import { parseSpaceInitPlugin, type SpaceSettingsProps } from '../types';

export const SpaceSettings = ({ settings }: { settings: SpaceSettingsProps }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const dispatch = useIntentDispatcher();
  const plugins = useResolvePlugins(parseSpaceInitPlugin);

  return (
    <>
      <SettingsValue label={t('show hidden spaces label')}>
        <Input.Switch
          checked={settings.showHidden}
          onCheckedChange={(checked) =>
            dispatch({
              plugin: SPACE_PLUGIN,
              action: SpaceAction.TOGGLE_HIDDEN,
              data: { state: !!checked },
            })
          }
        />
      </SettingsValue>

      <SettingsValue label={t('default on space create label')}>
        <Select.Root
          value={settings.onSpaceCreate}
          onValueChange={(value) => {
            settings.onSpaceCreate = value;
          }}
        >
          <Select.TriggerButton />
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {plugins.map(
                  ({
                    provides: {
                      space: { onSpaceCreate },
                    },
                  }) => (
                    <Select.Option key={onSpaceCreate.action} value={onSpaceCreate.action}>
                      {toLocalizedString(onSpaceCreate.label, t)}
                    </Select.Option>
                  ),
                )}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </SettingsValue>
    </>
  );
};
