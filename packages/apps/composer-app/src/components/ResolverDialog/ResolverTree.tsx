//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, useId, useTranslation } from '@dxos/aurora';
import { TreeRoot } from '@dxos/react-appkit';
import { observer, useClient, useIdentity, useSpaces } from '@dxos/react-client';

import { bindSpace } from '../../util';
import { ResolverProps } from './ResolverProps';
import { SpacePickerTreeItem } from './SpacePickerTreeItem';

export const ResolverTree = observer((props: ResolverProps) => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const treeLabel = useId('treeLabel');
  const { t } = useTranslation('composer');
  const identity = useIdentity();
  const identityHex = identity?.identityKey.toHex();
  return spaces.length ? (
    <>
      {' '}
      <span className='sr-only' id={treeLabel}>
        {t('sidebar tree label')}
      </span>
      <TreeRoot aria-labelledby={treeLabel} data-testid='composer.sidebarTree' className='shrink-0'>
        {spaces.map((space) => {
          return <SpacePickerTreeItem key={space.key.toHex()} space={space} {...props} />;
        })}
      </TreeRoot>
    </>
  ) : (
    <>
      <p className='text-center'>No spaces yet</p>
      <Button
        className='block is-full'
        onClick={async () => {
          const space = await client.createSpace();
          bindSpace(space, identityHex ?? '', props.source, props.id);
          props.setNextSpace(space);
        }}
      >
        Create one for this repository
      </Button>
    </>
  );
});
