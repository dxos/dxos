//
// Copyright 2023 DXOS.org
//

import React, { useContext } from 'react';

import { Button, useId, useTranslation } from '@dxos/aurora';
import { TreeRoot } from '@dxos/react-appkit';
import { observer, useClient, useSpaces } from '@dxos/react-client';

import { bindSpace } from '../../util';
import { SpaceResolverContext } from './ResolverContext';
import { SpacePickerTreeItem } from './SpacePickerTreeItem';

export const ResolverTree = observer(() => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const treeLabel = useId('treeLabel');
  const { t } = useTranslation('composer');
  const { setSpace, source, id, identityHex } = useContext(SpaceResolverContext);
  return spaces.length ? (
    <>
      {' '}
      <h1 className='text-lg font-system-normal' id={treeLabel}>
        {t('resolver tree label')}
      </h1>
      <div role='separator' className='bs-px bg-neutral-500/20 mlb-2' />
      <TreeRoot aria-labelledby={treeLabel} data-testid='composer.sidebarTree' className='shrink-0'>
        {spaces.map((space) => {
          return (
            <SpacePickerTreeItem
              key={space.key.toHex()}
              {...{ space, setSpace, identityHex: identityHex!, source: source!, id: id! }}
            />
          );
        })}
      </TreeRoot>
    </>
  ) : (
    <>
      <h1 className='text-lg font-system-normal' id={treeLabel}>
        {t('resolver no spaces message')}
      </h1>
      <div role='separator' className='bs-px bg-neutral-500/20 mlb-2' />
      <Button
        className='block is-full'
        onClick={async () => {
          const space = await client.createSpace();
          bindSpace(space, identityHex!, source!, id!);
          setSpace(space);
        }}
      >
        {t('resolver create space label')}
      </Button>
    </>
  );
});
