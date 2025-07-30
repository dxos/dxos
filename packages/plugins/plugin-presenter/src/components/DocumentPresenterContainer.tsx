//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { type Document } from '@dxos/plugin-markdown/types';
import { StackItem } from '@dxos/react-ui-stack';

import { RevealPlayer } from './RevealPlayer';
import { useExitPresenter } from '../useExitPresenter';

const DocumentPresenterContainer: FC<{ document: Document.Document }> = ({ document }) => {
  const handleExit = useExitPresenter(document);

  return (
    <StackItem.Content classNames='relative'>
      <RevealPlayer content={document.content.target?.content ?? ''} onExit={handleExit} />
    </StackItem.Content>
  );
};

export default DocumentPresenterContainer;
