//
// Copyright 2021 DXOS.org
//

import cx from 'classnames';
import React, { FunctionComponent } from 'react';
import { Link } from 'react-router-dom';

import { Space } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import {
  Avatar,
  Heading,
  defaultGroup,
  defaultHover,
  defaultFocus,
  defaultDisabled,
  Group,
  useTranslation
} from '@dxos/react-utailikit';
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
  const { t } = useTranslation('halo');
  return spaces.length ? (
    <>
      {spaces.map((space) => {
        const keyHex = space.key.toHex();
        const title = space.properties.get('title') ?? humanize(keyHex);

        return (
          <Link
            to={`/spaces/${keyHex}`}
            key={keyHex}
            className={cx(
              defaultGroup({ elevation: 1, rounding: 'rounded', spacing: 'p-2' }),
              'flex items-stretch gap-2 mbe-2',
              defaultHover({}),
              defaultFocus
            )}
          >
            <Heading level={2} className='grow flex items-center mbe-0'>
              <Avatar
                size={12}
                fallbackValue={keyHex}
                className='flex gap-1 items-center pr-2 rounded'
                label={<p className='text-lg grow'>{title}</p>}
              />
            </Heading>
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
        className: cx('text-xl', defaultDisabled)
      }}
      elevation={0}
    >
      <p className={defaultDisabled}>{t('empty spaces message')}</p>
    </Group>
  );
};
