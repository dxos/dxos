//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useId, useTranslation } from '@dxos/aurora';
import { TreeRoot } from '@dxos/react-appkit';
import { observer, useSpaces } from '@dxos/react-client';

import { SpacePickerTreeItem } from './SpacePickerTreeItem';

export const ResolverTree = observer((props: { source: string; id: string }) => {
  const spaces = useSpaces({ all: true });
  const treeLabel = useId('treeLabel');
  const { t } = useTranslation('composer');
  return (
    <>
      <span className='sr-only' id={treeLabel}>
        {t('sidebar tree label')}
      </span>
      <TreeRoot aria-labelledby={treeLabel} data-testid='composer.sidebarTree' className='shrink-0'>
        {spaces.map((space) => {
          return <SpacePickerTreeItem key={space.key.toHex()} space={space} {...props} />;
        })}
      </TreeRoot>
    </>
  );
});
