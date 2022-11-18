//
// Copyright 2021 DXOS.org
//

import cx from 'classnames';
import React from 'react';
import { Link } from 'react-router-dom';

import { Space } from '@dxos/client';
import { Heading } from '@dxos/react-ui';
import { Avatar, defaultGroup, defaultHover, defaultFocus } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface SpaceListProps {
  spaces?: Array<Space>;
}

export const SpaceList = ({ spaces = [] }: SpaceListProps) => {
  return (
    <div role='none' className='m-0 flex flex-col gap-2'>
      {spaces.map((space) => {
        const keyHex = space.key.toHex();
        const title = space.properties.get('title') ?? humanize(keyHex);

        return (
          <div
            role='group'
            key={keyHex}
            className={cx(
              defaultGroup({ elevation: 1, spacing: 'p-2', rounding: 'rounded' }),
              'flex items-stretch gap-2'
            )}
          >
            <Heading level={2} className='grow flex items-center mb-0'>
              <Link
                to={`/spaces/${keyHex}`}
                className={cx('flex gap-1 items-center pr-2 rounded', defaultHover({}), defaultFocus)}
              >
                <Avatar size={12} fallbackValue={keyHex} label={<p className='text-lg grow'>{title}</p>} />
              </Link>
            </Heading>
          </div>
        );
      })}
    </div>
  );
};
