//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { Space } from '@dxos/client';
import {
  Avatar,
  defaultGroup,
  hover,
  defaultFocus,
  useTranslation,
  defaultDisabled,
  Group,
  Heading,
  mx
} from '@dxos/react-components';
import { humanize } from '@dxos/util';

export interface SpaceListProps {
  spaces?: Array<Space>;
}

export const SpaceList = ({ spaces = [] }: SpaceListProps) => {
  const { t } = useTranslation('appkit');
  return spaces.length ? (
    <>
      {spaces.map((space) => {
        const keyHex = space.key.toHex();
        const title = space.properties.get('title') ?? humanize(keyHex);

        return (
          <Link
            to={`/spaces/${keyHex}`}
            role='group'
            key={keyHex}
            className={mx(
              defaultGroup({ elevation: 'group', rounding: 'rounded', spacing: 'p-2' }),
              'flex items-stretch gap-2 mbe-2',
              hover(),
              defaultFocus
            )}
          >
            <Heading level={2} className='grow flex items-center mbe-0'>
              <Avatar
                size={12}
                fallbackValue={keyHex}
                label={<p className='text-lg grow'>{title}</p>}
                slots={{ root: { className: 'flex gap-1 items-center pr-2 rounded' } }}
              />
            </Heading>
          </Link>
        );
      })}
    </>
  ) : (
    <Group
      className='mlb-4'
      label={{
        level: 2,
        children: t('empty spaces label'),
        className: mx('text-xl', defaultDisabled)
      }}
      elevation='base'
    >
      <p className={defaultDisabled}>{t('empty spaces message')}</p>
    </Group>
  );
};
