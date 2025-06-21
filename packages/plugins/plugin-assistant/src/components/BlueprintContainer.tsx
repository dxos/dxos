//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { ToolRegistry } from '@dxos/ai';
import { useCapability } from '@dxos/app-framework';
import {
  type BlueprintDefinition,
  type Blueprint,
  BlueprintParser,
  BlueprintMachine,
  setConsolePrinter,
} from '@dxos/assistant';
import { log } from '@dxos/log';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem, type StackItemContentProps } from '@dxos/react-ui-stack';

import { BlueprintEditor } from './BlueprintEditor';
import { AssistantCapabilities } from '../capabilities';
import { meta } from '../meta';

export const BlueprintContainer = ({
  role,
  blueprint,
}: Pick<StackItemContentProps, 'role'> & { blueprint: Blueprint }) => {
  const { t } = useTranslation(meta.id);
  const aiClient = useCapability(AssistantCapabilities.AiClient);
  const [definition] = useState<BlueprintDefinition>({
    steps: blueprint.steps.map(({ instructions, tools }) => ({ instructions, tools })),
  });

  const handleSave = () => {
    log.info('save blueprint', definition);
  };

  const handleRun = useCallback(async () => {
    if (!aiClient?.value) {
      return;
    }

    // const space = getSpace(blueprint);
    const blueprint = BlueprintParser.create().parse(definition);
    const tools = new ToolRegistry([]);
    const machine = new BlueprintMachine(tools, blueprint);
    setConsolePrinter(machine, true);
    await machine.runToCompletion({ aiClient: aiClient.value, input: [] });
  }, [aiClient.value, blueprint]);

  return (
    <StackItem.Content role={role} toolbar>
      <Toolbar.Root classNames='border-be border-subduedSeparator'>
        <Toolbar.Button onClick={handleSave}>{t('button save')}</Toolbar.Button>
        <Toolbar.Button onClick={handleRun}>{t('button run')}</Toolbar.Button>
      </Toolbar.Root>
      <BlueprintEditor blueprint={definition} />
    </StackItem.Content>
  );
};

export default BlueprintContainer;
