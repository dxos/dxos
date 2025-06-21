//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { type BlueprintDefinition, type Blueprint } from '@dxos/assistant';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem, type StackItemContentProps } from '@dxos/react-ui-stack';

import { BlueprintEditor } from './BlueprintEditor';
import { meta } from '../meta';

// TODO(burdon): Compare with ScriptContainer.
export const BlueprintContainer = ({
  role,
  blueprint,
}: Pick<StackItemContentProps, 'role'> & { blueprint: Blueprint }) => {
  const { t } = useTranslation(meta.id);
  const [definition] = useState<BlueprintDefinition>({ steps: blueprint.steps });

  const handleSave = () => {
    console.log('save blueprint', definition);
  };

  return (
    <StackItem.Content role={role} toolbar>
      <Toolbar.Root>
        <Toolbar.Button onClick={handleSave}>{t('button save')}</Toolbar.Button>
      </Toolbar.Root>
      <BlueprintEditor blueprint={definition} />
    </StackItem.Content>
  );
};

export default BlueprintContainer;
