//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Markdown } from '@dxos/plugin-markdown/types';
import { Container } from '@dxos/react-ui';

import { RevealPlayer } from '../../components/RevealPlayer';
import { useExitPresenter } from '../../useExitPresenter';

export const DocumentPresenterContainer: FC<{ document: Markdown.Document }> = ({ document }) => {
  const handleExit = useExitPresenter(document);

  return (
    <Container.Main classNames='relative'>
      <RevealPlayer content={document.content.target?.content ?? ''} onExit={handleExit} />
    </Container.Main>
  );
};
