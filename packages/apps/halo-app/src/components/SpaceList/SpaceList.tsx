//
// Copyright 2021 DXOS.org
//

import cx from 'classnames';
import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { Avatar, Group, defaultGroup, defaultHover, defaultFocus } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface SpaceListProps {
  spaces?: Array<Space>;
  selected?: PublicKey;
  actionIcon?: FunctionComponent<any>;
  onSelect?: (space: PublicKey) => void;
  onAction?: (space: PublicKey, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

// TODO(wittjosiah): Unify with @dxos/react-appkit SpaceList.
export const SpaceList = ({ spaces = [] }: SpaceListProps) => {
  return (
    <>
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
              className: 'grow flex items-center mbe-0'
            }}
            className={cx(defaultGroup({ elevation: 1 }), 'flex items-stretch gap-2 mbe-2')}
          >
            {/* <div role='none' className='flex flex-col sm:flex-row sm:items-stretch gap-x-2 gap-y-1'>
              <Tooltip content={t('manage space label', { ns: 'uikit' })} side='top' tooltipLabelsTrigger>
                <Link to={`/spaces/${keyHex}/settings`} className={cx('flex gap-1', buttonStyles({ compact: true }))}>
                  <Gear className={getSize(5)} />
                </Link>
              </Tooltip>
              <Tooltip content={t('join label')} side='top' tooltipLabelsTrigger>
                <Link to={`/spaces/${keyHex}`} className={cx('flex gap-1', buttonStyles({ compact: true }))}>
                  <SignIn className={getSize(5)} />
                </Link>
              </Tooltip>
            </div> */}
          </Group>
        );
      })}
    </>
  );
};
