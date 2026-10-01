//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { Next } from '@dxos/react-ui';

import { DataSpaceSelector } from '../../../../containers/index.ts';
import { useDevtoolsState } from '../../../../hooks/index.ts';
import { SyncStateInfo } from '../../echo/SpaceInfoArticle/SyncStateInfo.tsx';
import { type ArticleProps } from '../../types.ts';

export type TestingArticleProps = ArticleProps & {
  onScriptPluginOpen?: (space: Space) => Promise<void>;
};

export const TestingArticle = ({ role, onScriptPluginOpen }: TestingArticleProps) => {
  const { space } = useDevtoolsState();

  const handleScriptPluginOpen = async () => {
    if (!space) {
      log.warn('no space');
      return;
    }
    await onScriptPluginOpen?.(space);
  };

  return (
    <Next.Panel.Root role={role}>
      <Next.Panel.Header>
        <Next.Toolbar.Root>
          <DataSpaceSelector />
        </Next.Toolbar.Root>
      </Next.Panel.Header>
      <Next.Panel.Body classNames='flex flex-col gap-4 p-4'>
        <Next.Button icon='ph--code--regular' label='Open Script Plugin' onClick={handleScriptPluginOpen} />
        <div className='border-t border-separator'>{space && <SyncStateInfo space={space} />}</div>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
