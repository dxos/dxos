//
// Copyright 2025 DXOS.org
//

import React, { type FC } from 'react';

import { AmbientDialog } from './AmbientDialog';
import { type AIChatType } from '../../types';
import { ThreadContainer } from '../Thread';

export const AssistantDialog: FC<{ chat?: AIChatType }> = ({ chat }) => {
  return (
    <AmbientDialog>
      <ThreadContainer chat={chat} />
    </AmbientDialog>
  );
};
