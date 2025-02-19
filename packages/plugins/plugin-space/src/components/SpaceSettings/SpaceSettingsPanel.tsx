//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { type ThemedClassName, Input, useTranslation } from '@dxos/react-ui';
import { DeprecatedFormContainer, DeprecatedFormInput } from '@dxos/react-ui-form';

import { SPACE_PLUGIN } from '../../meta';

export type SpaceSettingsPanelProps = ThemedClassName<{
  space: Space;
}>;

export const SpaceSettingsPanel = ({ classNames, space }: SpaceSettingsPanelProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  const client = useClient();
  const edgeEnabled = Boolean(client.config.values.runtime?.client?.edgeFeatures?.echoReplicator);

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
    <DeprecatedFormContainer>
      <DeprecatedFormInput label={t('name label')}>
        <Input.TextInput
          placeholder={t('unnamed space label')}
          value={space.properties.name ?? ''}
          onChange={(event) => {
            space.properties.name = event.target.value;
          }}
        />
      </DeprecatedFormInput>
      {edgeEnabled && (
        <DeprecatedFormInput label={t('edge replication label')}>
          <Input.Switch checked={edgeReplication} onCheckedChange={toggleEdgeReplication} />
        </DeprecatedFormInput>
      )}
    </DeprecatedFormContainer>
  );
};
