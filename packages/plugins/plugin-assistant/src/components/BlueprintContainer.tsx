//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { ToolRegistry } from '@dxos/ai';
import { useCapability } from '@dxos/app-framework';
import {
  type Blueprint,
  type BlueprintDefinition,
  BlueprintLoggerAdapter,
  BlueprintParser,
  BlueprintMachine,
  createLocalSearchTool,
  createExaTool,
  createGraphWriterTool,
} from '@dxos/assistant';
import { getSpace } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem, type StackItemContentProps } from '@dxos/react-ui-stack';

import { BlueprintEditor } from './BlueprintEditor';
import { AssistantCapabilities } from '../capabilities';
import { meta } from '../meta';

// TODO(burdon): Move to config.
export const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';

export const BlueprintContainer = ({
  role,
  blueprint,
}: Pick<StackItemContentProps, 'role'> & { blueprint: Blueprint }) => {
  const { t } = useTranslation(meta.id);
  const aiClient = useCapability(AssistantCapabilities.AiClient);
  const [definition] = useState<BlueprintDefinition>({
    steps: blueprint.steps.map(({ instructions, tools }) => ({ instructions, tools })),
  });

  // TODO(burdon): Factor out.
  const toolRegistry = useMemo(() => {
    const space = getSpace(blueprint);
    if (!space) {
      return;
    }

    // TODO(burdon): How should the queue be created?
    const queue = space.queues.create();

    return new ToolRegistry([
      createExaTool({ apiKey: EXA_API_KEY }),
      createLocalSearchTool(space.db, queue),
      createGraphWriterTool({
        db: space.db,
        queue,
        schema: [], // TODO(burdon): Get schema from client/blueprint?
        onDone: async (objects) => {
          queue.append(objects);
        },
      }),
    ]);
  }, [blueprint]);

  // TODO(burdon): Need to save raw blueprint separately from parsed blueprint? (like Script).
  const handleSave = () => {
    log.info('save blueprint', definition);
  };

  const handleRun = useCallback(async () => {
    if (!aiClient?.value || !toolRegistry) {
      return;
    }

    // TODO(burdon): Get input from selection?
    const input: any[] = [];

    const blueprint = BlueprintParser.create().parse(definition);
    const machine = new BlueprintMachine(toolRegistry, blueprint).setLogger(new BlueprintLoggerAdapter());
    await machine.runToCompletion({ aiClient: aiClient.value, input });
  }, [aiClient.value, toolRegistry, blueprint]);

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
