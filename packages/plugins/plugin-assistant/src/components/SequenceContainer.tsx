//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import JSON5 from 'json5';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type Sequence, type SequenceDefinition } from '@dxos/conductor';
import { Key } from '@dxos/echo';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { useSelectionManager } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { meta } from '../meta';

import { SequenceEditor } from './SequenceEditor';

// TODO(burdon): Move to config.
export const EXA_API_KEY = '9c7e17ff-0c85-4cd5-827a-8b489f139e03';

// TODO(burdon): Validate.
const parseSequence = (text: string): SequenceDefinition | undefined => {
  try {
    const json = JSON5.parse(text);
    const { steps } = json;
    return { steps };
  } catch {
    // Ignore.
  }
};

export const SequenceContainer = ({ sequence }: { sequence: Sequence }) => {
  const { t } = useTranslation(meta.id);
  const selectionManager = useSelectionManager();
  const [definition, setDefinition] = useState<SequenceDefinition>();
  useEffect(() => {
    setDefinition({
      steps: sequence.steps.map(({ instructions, tools }) => ({ instructions, tools })),
    });
  }, [sequence]);

  const editorRef = useRef<EditorView>(null);

  // TODO(burdon): Factor out.
  // const toolRegistry = useMemo(() => {
  //   const space = getSpace(sequence);
  //   if (!space) {
  //     return;
  //   }

  //   // TODO(burdon): How should the queue be created?
  //   // eslint-disable-next-line no-unused-vars
  //   const _queue = space.queues.create();

  //   return new ToolRegistry([
  //     // createExaTool({ apiKey: EXA_API_KEY }),
  //     // createLocalSearchTool(space.db, queue),
  //     // createGraphWriterTool({
  //     //   db: space.db,
  //     //   queue,
  //     //   schema: [], // TODO(burdon): Get schema from client/sequence?
  //     //   onDone: async (objects) => {
  //     //     await queue.append(objects);
  //     //   },
  //     // }),
  //   ]);
  // }, [sequence]);

  const formatAndSave = useCallback((): SequenceDefinition | undefined => {
    if (!sequence) {
      return;
    }

    const text = editorRef.current?.state.doc.toString();
    if (!text) {
      return;
    }

    const definition = parseSequence(text);
    if (!definition) {
      return;
    }

    setDefinition(definition);
    const formatted = JSON.stringify(definition, null, 2);
    editorRef.current?.dispatch({
      changes: { from: 0, to: text.length, insert: formatted },
    });

    sequence.steps.length = 0;
    for (const step of definition.steps) {
      sequence.steps.push({
        id: Key.ObjectId.random(),
        instructions: step.instructions,
        tools: step.tools,
      });
    }

    return sequence;
  }, [sequence]);

  // TODO(burdon): Save raw sequence separately from parsed sequence? (like Script).
  const handleSave = useCallback(() => formatAndSave(), [formatAndSave]);

  const handleRun = useCallback(async () => {
    // if (!aiClient?.value || !toolRegistry) {
    //   return;
    // }
    // formatAndSave();
    // // Get input from selection.
    // const input = Array.from(getSelectionSet(selectionManager)).map((id) => DXN.fromLocalObjectId(id));
    // if (!input.length) {
    //   return;
    // }
    // const machine = new SequenceMachine(toolRegistry, sequence).setLogger(new QueueLogger(sequence));
    // await machine.runToCompletion({ aiClient: aiClient.value, input });
  }, [sequence, formatAndSave, selectionManager]);

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root>
        <Toolbar.Button onClick={handleSave}>{t('button save')}</Toolbar.Button>
        <Toolbar.Button onClick={handleRun}>{t('button run')}</Toolbar.Button>
      </Toolbar.Root>
      {definition && <SequenceEditor ref={editorRef} sequence={definition} />}
    </StackItem.Content>
  );
};

export default SequenceContainer;
