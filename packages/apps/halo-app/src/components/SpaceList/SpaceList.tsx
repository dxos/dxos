//
// Copyright 2021 DXOS.org
//

import cx from 'classnames';
import { Users, Nut } from 'phosphor-react';
import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';

import { Party } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { Avatar, defaultHover, defaultFocus, Tag } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface SpaceListProps {
  spaces?: Array<Party>;
  selected?: PublicKey;
  actionIcon?: FunctionComponent<any>;
  onSelect?: (space: PublicKey) => void;
  onAction?: (space: PublicKey, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const SpaceList = ({ spaces = [] }: SpaceListProps) => {
  return (
    <div role='none' className='m-0 flex flex-col gap-4'>
      {spaces.map((space) => {
        const keyHex = space.key.toHex();
        const title = space.properties.get('title') ?? humanize(keyHex);

        return (
          <Link
            key={keyHex}
            to={`/spaces/${keyHex}`}
            className={cx(
              'bg-white dark:bg-neutral-800 elevated-buttons shadow-sm',
              'rounded-md p-3 flex-none',
              'flex gap-2 items-center',
              defaultFocus,
              defaultHover({})
            )}
          >
            <Avatar size={12} fallbackValue={keyHex} label={<p className='text-lg grow'>{title}</p>} />
            <div role='none' className='flex flex-col items-end gap-2'>
              <Tag className='inline-flex gap-1 items-center'>
                <Users />
                {'18'}
              </Tag>
              <Tag className='inline-flex gap-1 items-center'>
                <Nut />
                {'4'}
              </Tag>
            </div>
          </Link>
        );
      })}
    </div>
  );
};
