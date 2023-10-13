//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useContext } from 'react';

import { Button, Dialog, Tree, useId, useTranslation } from '@dxos/aurora';
import { useClient } from '@dxos/react-client';
import { useSpaces, type Space } from '@dxos/react-client/echo';

import { SpaceResolverContext } from './ResolverContext';
import { SpacePickerTreeItem } from './SpacePickerTreeItem';
import { bindSpace, unbindSpace } from './spaceResolvers';
import { GITHUB_PLUGIN } from '../../props';

export const ResolverTree = () => {
  const client = useClient();
  const spaces = useSpaces({ all: true });
  const treeLabel = useId('treeLabel');
  const { t } = useTranslation(GITHUB_PLUGIN);
  const {
    space: selectedSpace,
    setSpace: setSelectedSpace,
    source,
    id,
    identityHex,
  } = useContext(SpaceResolverContext);
  const setSpace = useCallback(
    (nextSpace: Space | null) => {
      if (identityHex && source && id) {
        selectedSpace && unbindSpace(selectedSpace, identityHex, source, id);
        nextSpace && bindSpace(nextSpace, identityHex, source, id);
      }
      setSelectedSpace(nextSpace);
    },
    [selectedSpace, setSelectedSpace, identityHex, source, id],
  );
  return spaces.length ? (
    <>
      {' '}
      <Dialog.Title tabIndex={-1} classNames='shrink-0'>
        {t('resolver tree label')}
      </Dialog.Title>
      <Dialog.Description>{t('resolver tree description')}</Dialog.Description>
      <div role='separator' className='shrink-0 bs-px bg-neutral-500/20 mlb-1' />
      <Tree.Root
        aria-label={t('resolver tree label')}
        data-testid='composer.sidebarTree'
        classNames='overflow-y-auto -mli-2 p-2'
      >
        {spaces.map((space) => {
          return (
            <SpacePickerTreeItem
              key={space.key.toHex()}
              {...{
                space,
                selected: selectedSpace === space,
                setSpace,
                identityHex: identityHex!,
                source: source!,
                id: id!,
              }}
            />
          );
        })}
      </Tree.Root>
    </>
  ) : (
    <>
      <h1 className='text-lg font-system-normal' id={treeLabel}>
        {t('resolver no spaces message')}
      </h1>
      <div role='separator' className='bs-px bg-neutral-500/20 mlb-2' />
      <Button
        classNames='block is-full'
        onClick={async () => {
          const space = await client.spaces.create();
          bindSpace(space, identityHex!, source!, id!);
          setSpace(space);
        }}
      >
        {t('resolver create space label')}
      </Button>
    </>
  );
};
