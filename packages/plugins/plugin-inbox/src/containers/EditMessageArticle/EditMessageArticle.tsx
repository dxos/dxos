//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, Toolbar } from '@dxos/react-ui';
import { type Message } from '@dxos/types';

import { EditMessage } from '#components';
import { useEmailComposer } from '#hooks';

export type EditMessageArticleProps = AppSurface.ObjectArticleProps<Message.Message>;

export const EditMessageArticle = ({ role, subject }: EditMessageArticleProps) => {
  const { extensions, onSend } = useEmailComposer(subject);

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <EditMessage message={subject} extensions={extensions} onSend={onSend} />
      </Panel.Content>
    </Panel.Root>
  );
};
