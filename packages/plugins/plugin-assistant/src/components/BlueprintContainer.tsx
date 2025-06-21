//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { type BlueprintDefinition, type Blueprint } from '@dxos/assistant';
import { StackItem } from '@dxos/react-ui-stack';

import { BlueprintEditor } from './BlueprintEditor';

export const BlueprintContainer = ({ role, blueprint }: { role: string; blueprint: Blueprint }) => {
  const [definition, setDefinition] = useState<BlueprintDefinition>({ steps: blueprint.steps });

  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <BlueprintEditor blueprint={definition} />
    </StackItem.Content>
  );
};

export default BlueprintContainer;
