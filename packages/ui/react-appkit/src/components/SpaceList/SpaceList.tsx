//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { Link } from 'react-router-dom';

import { useTranslation } from '@dxos/aurora';
import { group, hoverColors, focusRing, staticDisabled, mx } from '@dxos/aurora-theme';
import { type Space } from '@dxos/react-client/echo';
import { humanize } from '@dxos/util';

import { Avatar } from '../Avatar';
import { Group } from '../Group';
import { Heading } from '../Heading';

export interface SpaceListProps {
  spaces?: Array<Space>;
}

export const SpaceList = ({ spaces = [] }: SpaceListProps) => {
  const { t } = useTranslation('appkit');
  return spaces.length ? (
    <>
      {spaces.map((space) => {
        const keyHex = space?.key.toHex();
        const title = space?.properties?.title ?? humanize(keyHex);

        return (
          <Link
            to={`/spaces/${keyHex}`}
            role='group'
            key={keyHex}
            className={mx(
              group({ elevation: 'group' }),
              'rounded p-2 flex items-stretch gap-2 mbe-2',
              hoverColors,
              focusRing,
            )}
          >
            <Heading level={2} className='grow flex items-center mbe-0'>
              <Avatar
                size={12}
                fallbackValue={keyHex}
                label={<p className='text-lg grow'>{title}</p>}
                slots={{ root: { classNames: 'flex gap-1 items-center pr-2 rounded' } }}
              />
            </Heading>
          </Link>
        );
      })}
    </>
  ) : (
    <Group
      className='mlb-4 p-2 rounded'
      label={{
        level: 2,
        children: t('empty spaces label'),
        className: mx('text-xl', staticDisabled),
      }}
      elevation='base'
    >
      <p className={staticDisabled}>{t('empty spaces message')}</p>
    </Group>
  );
};
