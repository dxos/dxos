//
// Copyright 2021 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { Link } from 'react-router-dom';

import { Party } from '@dxos/client';
import { Avatar, Group, defaultGroup, defaultHover, defaultFocus } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface SpaceListProps {
  spaces?: Array<Party>;
}

export const SpaceList = ({ spaces = [] }: SpaceListProps) => {
  return (
    <div role='none' className='m-0 flex flex-col gap-4'>
      {spaces.map((space) => {
        const keyHex = space.key.toHex();
        const title = space.properties.get('title') ?? humanize(keyHex);

        return (
          <Group
            key={keyHex}
            label={{
              level: 2,
              children: (
                <Link
                  to={`/spaces/${keyHex}`}
                  className={cx('flex gap-1 items-center pr-2 rounded', defaultHover({}), defaultFocus)}
                >
                  <Avatar size={12} fallbackValue={keyHex} label={<p className='text-lg grow'>{title}</p>} />
                </Link>
              ),
              className: 'grow flex items-center mb-0'
            }}
            className={cx(defaultGroup({ elevation: 1 }), 'flex items-stretch gap-2')}
          />
        );
      })}
    </div>
  );
};
