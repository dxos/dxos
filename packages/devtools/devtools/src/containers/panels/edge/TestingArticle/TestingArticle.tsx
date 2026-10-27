//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

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
    <Panel.Root role={role}>
      <Panel.Header>
        <Toolbar.Root>
          <DataSpaceSelector />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='flex flex-col gap-4 p-4'>
        <Button.Root icon='ph--code--regular' label='Open Script Plugin' onClick={handleScriptPluginOpen} />
        <div className='border-t border-separator'>{space && <SyncStateInfo space={space} />}</div>
      </Panel.Body>
    </Panel.Root>
  );
};
