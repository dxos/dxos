//
// Copyright 2025 DXOS.org
//

import React, { useState } from 'react';

import { type BlueprintDefinition, type Blueprint } from '@dxos/assistant';
import { log } from '@dxos/log';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem, type StackItemContentProps } from '@dxos/react-ui-stack';

import { BlueprintEditor } from './BlueprintEditor';
import { meta } from '../meta';

export const BlueprintContainer = ({
  role,
  blueprint,
}: Pick<StackItemContentProps, 'role'> & { blueprint: Blueprint }) => {
  const { t } = useTranslation(meta.id);
  const [definition] = useState<BlueprintDefinition>({ steps: blueprint.steps });

  const handleSave = () => {
    log.info('save blueprint', definition);
  };

  return (
    <StackItem.Content role={role} toolbar>
      <Toolbar.Root classNames='border-be border-subduedSeparator'>
        <Toolbar.Button onClick={handleSave}>{t('button save')}</Toolbar.Button>
      </Toolbar.Root>
      <BlueprintEditor blueprint={definition} />
    </StackItem.Content>
  );
};

export default BlueprintContainer;
