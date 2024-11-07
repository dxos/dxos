//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { type Space } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export type SpaceSettingsPanelProps = {
  space: Space;
};

export const SpaceSettingsPanel = ({ space }: SpaceSettingsPanelProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const [edgeReplication, setEdgeReplication] = useState(
    space.internal.data.edgeReplication === EdgeReplicationSetting.ENABLED,
  );

  const toggleEdgeReplication = useCallback(
    async (next: boolean) => {
      setEdgeReplication(next);
      await space?.internal
        .setEdgeReplicationPreference(next ? EdgeReplicationSetting.ENABLED : EdgeReplicationSetting.DISABLED)
        .catch((err) => {
          log.catch(err);
          setEdgeReplication(!next);
        });
    },
    [space],
  );

  return (
    <div role='form' className='flex flex-col w-full p-2 gap-4'>
      <Input.Root>
        <div role='none' className='flex flex-col gap-1'>
          <Input.Label>{t('name label')}</Input.Label>
          <Input.TextInput
            placeholder={t('name placeholder')}
            value={space.properties.name ?? ''}
            onChange={(event) => {
              space.properties.name = event.target.value;
            }}
          />
        </div>
      </Input.Root>
      <Input.Root>
        <div role='none' className='flex justify-between'>
          <Input.Label>{t('edge replication label')}</Input.Label>
          <Input.Switch checked={edgeReplication} onCheckedChange={toggleEdgeReplication} />
        </div>
      </Input.Root>
    </div>
  );
};
