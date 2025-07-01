//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import JSON5 from 'json5';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ToolRegistry } from '@dxos/ai';
import { useCapability } from '@dxos/app-framework';
import {
  type Blueprint,
  type BlueprintDefinition,
  BlueprintMachine,
  createLocalSearchTool,
  createExaTool,
  createGraphWriterTool,
} from '@dxos/assistant';
import { getSpace } from '@dxos/client/echo';
import { DXN, Key } from '@dxos/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { getSelectionSet, useSelectionManager } from '@dxos/react-ui-attention';
import { StackItem, type StackItemContentProps } from '@dxos/react-ui-stack';

import { BlueprintEditor } from './BlueprintEditor';
import { AssistantCapabilities } from '../capabilities';
import { meta } from '../meta';
import { QueueLogger } from '../queue-logger';

// TODO(burdon): Move to config.
export const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';

// TODO(burdon): Validate.
const parseBlueprint = (text: string): BlueprintDefinition | undefined => {
  try {
    const json = JSON5.parse(text);
    const { steps } = json;
    return { steps };
  } catch (error) {
    // Ignore.
  }
};

export const BlueprintContainer = ({
  role,
  blueprint,
}: Pick<StackItemContentProps, 'role'> & { blueprint: Blueprint }) => {
  const { t } = useTranslation(meta.id);
  const aiClient = useCapability(AssistantCapabilities.AiClient);
  const selectionManager = useSelectionManager();
  const [definition, setDefinition] = useState<BlueprintDefinition>();
  useEffect(() => {
    setDefinition({
      steps: blueprint.steps.map(({ instructions, tools }) => ({ instructions, tools })),
    });
  }, [blueprint]);

  const editorRef = useRef<EditorView | undefined>(undefined);

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
          await queue.append(objects);
        },
      }),
    ]);
  }, [blueprint]);

  const formatAndSave = useCallback((): BlueprintDefinition | undefined => {
    if (!blueprint) {
      return;
    }

    const text = editorRef.current?.state.doc.toString();
    if (!text) {
      return;
    }

    const definition = parseBlueprint(text);
    if (!definition) {
      return;
    }

    setDefinition(definition);
    const formatted = JSON.stringify(definition, null, 2);
    editorRef.current?.dispatch({
      changes: { from: 0, to: text.length, insert: formatted },
    });

    blueprint.steps.length = 0;
    for (const step of definition.steps) {
      blueprint.steps.push({
        id: Key.ObjectId.random(),
        instructions: step.instructions,
        tools: step.tools,
      });
    }

    return blueprint;
  }, [blueprint]);

  // TODO(burdon): Save raw blueprint separately from parsed blueprint? (like Script).
  const handleSave = useCallback(() => formatAndSave(), [formatAndSave]);

  const handleRun = useCallback(async () => {
    if (!aiClient?.value || !toolRegistry) {
      return;
    }

    formatAndSave();

    // Get input from selection.
    const input = Array.from(getSelectionSet(selectionManager)).map((id) => DXN.fromLocalObjectId(id));
    if (!input.length) {
      return;
    }

    const machine = new BlueprintMachine(toolRegistry, blueprint).setLogger(new QueueLogger(blueprint));
    await machine.runToCompletion({ aiClient: aiClient.value, input });
  }, [aiClient.value, blueprint, formatAndSave, selectionManager, toolRegistry]);

  return (
    <StackItem.Content role={role} toolbar>
      <Toolbar.Root>
        <Toolbar.Button onClick={handleSave}>{t('button save')}</Toolbar.Button>
        <Toolbar.Button onClick={handleRun}>{t('button run')}</Toolbar.Button>
      </Toolbar.Root>
      {definition && <BlueprintEditor ref={editorRef} blueprint={definition} />}
    </StackItem.Content>
  );
};

export default BlueprintContainer;
