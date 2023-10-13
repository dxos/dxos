//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useTranslation, Tag } from '@dxos/aurora';
import { type PublicKey } from '@dxos/react-client';

import { Avatar } from '../Avatar';
import { Group } from '../Group';

export interface DeviceProps {
  publicKey: PublicKey;
  displayName?: string;
  isCurrentDevice?: boolean;
}

export const Device = (props: DeviceProps) => {
  const { t } = useTranslation('appkit');
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
                  <Tag palette='info' classNames='mli-2 align-middle'>
                    {t('current device label')}
                  </Tag>
                )}
              </p>
            }
          />
        ),
      }}
      className='mbe-2 p-2 rounded'
    />
  );
};
