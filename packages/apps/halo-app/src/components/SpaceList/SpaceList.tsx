//
// Copyright 2021 DXOS.org
//

import cx from 'classnames';
import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';

import { Party } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { Avatar, defaultHover, defaultFocus } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface SpaceListProps {
  spaces?: Array<Party>;
  selected?: PublicKey;
  actionIcon?: FunctionComponent<any>;
  onSelect?: (space: PublicKey) => void;
  onAction?: (
    space: PublicKey,
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
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
              'flex items-center gap-2 p-2 rounded',
              defaultFocus,
              defaultHover({})
            )}
          >
            <Avatar
              size={10}
              fallbackValue={keyHex}
              label={<p className='text-lg'>{title}</p>}
            />
          </Link>
        );
      })}
    </div>
  );
};
