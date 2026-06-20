//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Markdown } from '@dxos/plugin-markdown';
import { Panel } from '@dxos/react-ui';

import { PresentationShell, RevealPlayer } from '#components';

import { useExitPresenter } from '../../useExitPresenter';

export const DocumentPresenterContainer: FC<{ document: Markdown.Document }> = ({ document }) => {
  const handleExit = useExitPresenter(document);

  return (
    <Panel.Root classNames='relative'>
      <Panel.Content asChild>
        <PresentationShell onExit={handleExit}>
          <RevealPlayer content={document.content.target?.content ?? ''} />
        </PresentationShell>
      </Panel.Content>
    </Panel.Root>
  );
};
