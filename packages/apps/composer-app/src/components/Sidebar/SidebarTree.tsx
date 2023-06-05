//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useId, useTranslation, Tree } from '@dxos/aurora';
import { observer, useIdentity, useSpaces } from '@dxos/react-client';

import { FullSpaceTreeItem } from './FullSpaceTreeItem';
import { HiddenSpacesTree } from './HiddenSpacesTree';

export const SidebarTree = observer(() => {
  const spaces = useSpaces({ all: true });
  const treeLabel = useId('treeLabel');
  const { t } = useTranslation('composer');
  const identity = useIdentity();
  return (
    <div className='grow flex flex-col plb-1.5 pis-1 pie-1.5 min-bs-0 overflow-y-auto overscroll-contain'>
      <span className='sr-only' id={treeLabel}>
        {t('sidebar tree label')}
      </span>
      <Tree.Root aria-labelledby={treeLabel} data-testid='composer.sidebarTree' classNames='shrink-0'>
        {spaces
          .filter((space) => !identity || space.properties.members?.[identity.identityKey.toHex()]?.hidden !== true)
          .map((space) => {
            return <FullSpaceTreeItem key={space.key.toHex()} space={space} />;
          })}
      </Tree.Root>
      <div role='none' className='grow' />
      <HiddenSpacesTree
        hiddenSpaces={spaces.filter(
          (space) => !identity || space.properties.members?.[identity.identityKey.toHex()]?.hidden === true,
        )}
      />
    </div>
  );
});
