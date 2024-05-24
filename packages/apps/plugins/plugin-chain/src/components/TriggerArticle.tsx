//
// Copyright 2024 DXOS.org
//

import React, { useMemo, type FC } from 'react';

import { type ChainType } from '@braneframe/types';
import { create } from '@dxos/echo-schema';
import { FunctionTrigger } from '@dxos/functions/types';

import { TriggerEditor } from './TriggerEditor';

const ChainArticle: FC<{ trigger: FunctionTrigger }> = ({ trigger }) => {
  return (
    <div role='none' className={'row-span-2 pli-2'}>
      <TriggerEditor trigger={trigger} />
    </div>
  );
};

export default ChainArticle;
