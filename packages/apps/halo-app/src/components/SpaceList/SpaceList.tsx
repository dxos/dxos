//
// Copyright 2021 DXOS.org
//

import cx from 'classnames';
import { Users, Nut, SignIn, Gear } from 'phosphor-react';
import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';

import { Party } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import {
  Avatar,
  Tag,
  Group,
  defaultGroup,
  defaultHover,
  defaultFocus,
  useTranslation,
  getSize,
  Tooltip,
  buttonStyles
} from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface SpaceListProps {
  spaces?: Array<Party>;
  selected?: PublicKey;
  actionIcon?: FunctionComponent<any>;
  onSelect?: (space: PublicKey) => void;
  onAction?: (space: PublicKey, event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export const SpaceList = ({ spaces = [] }: SpaceListProps) => {
  const { t } = useTranslation('halo');
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
          >
            <div role='none' className='flex flex-col justify-center items-end gap-x-2 gap-y-1'>
              <Tag className='inline-flex gap-1 items-center'>
                <Users weight='bold' />
                {'##'}
              </Tag>
              <Tag className='inline-flex gap-1 items-center'>
                <Nut weight='bold' />
                {'##'}
              </Tag>
            </div>
            <div role='none' className='flex flex-col sm:flex-row sm:items-stretch gap-x-2 gap-y-1'>
              <Tooltip content={t('manage party label', { ns: 'uikit' })} side='left' tooltipLabelsTrigger>
                <Link to={`/spaces/${keyHex}/settings`} className={cx('flex gap-1', buttonStyles({ compact: true }))}>
                  <Gear className={getSize(5)} />
                </Link>
              </Tooltip>
              <Tooltip content={t('join label')} side='left' tooltipLabelsTrigger>
                <Link to={`/spaces/${keyHex}`} className={cx('flex gap-1', buttonStyles({ compact: true }))}>
                  <SignIn className={getSize(5)} />
                </Link>
              </Tooltip>
            </div>
          </Group>
        );
      })}
    </div>
  );
};
