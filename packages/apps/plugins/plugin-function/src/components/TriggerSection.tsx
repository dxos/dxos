//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type FunctionTrigger } from '@dxos/functions/types';
import { useSpace } from '@dxos/react-client/echo';

import { TriggerEditor } from './TriggerEditor';

const TriggerSection: FC<{ trigger: FunctionTrigger }> = ({ trigger }) => {
  const space = useSpace();
  if (!space) {
    return null;
  }

  return (
    <div role='none' className={'pli-2'}>
      <TriggerEditor trigger={trigger} space={space} />
    </div>
  );
};

export default TriggerSection;
