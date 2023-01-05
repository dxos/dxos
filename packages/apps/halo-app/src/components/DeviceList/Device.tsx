//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Avatar, Group, Tag, useTranslation } from '@dxos/react-ui';

export interface DeviceProps {
  publicKey: PublicKey;
  displayName?: string;
  isCurrentDevice?: boolean;
}

export const Device = (props: DeviceProps) => {
  const { t } = useTranslation('halo');
  return (
    <Group
      label={{
        level: 2,
        className: 'mb-0 text-lg font-body flex gap-2 items-center',
        children: (
          <Avatar
            size={10}
            fallbackValue={props.publicKey.toHex()}
            label={
              <p>
                {props.displayName}
                {props.isCurrentDevice && (
                  <Tag valence='info' className='mli-2 align-middle'>
                    {t('current device label')}
                  </Tag>
                )}
              </p>
            }
          />
        )
      }}
      className='mbe-2'
    />
  );
};
