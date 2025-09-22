//
// Copyright 2025 DXOS.org
//
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Effect } from 'effect';
import React, { useState } from 'react';

import { extractionAnthropicFn } from '@dxos/assistant/extraction';
import { Obj } from '@dxos/echo';
import { LocalFunctionExecutionService } from '@dxos/functions';
import { log } from '@dxos/log';
import { type Space, useSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';
import { seedTestData } from '@dxos/schema/testing';

import { useComputeRuntimeCallback } from '../hooks';

import { config, getDecorators } from './testing';

const ExtractionContainer = ({ space }: { space: Space }) => {
  const [input, setInput] = useState<DataType.Message | undefined>();
  const run = useComputeRuntimeCallback(
    space,
    Effect.fnUntraced(function* () {
      const result = yield* LocalFunctionExecutionService.invokeFunction(extractionAnthropicFn, {
        message: input!,
      });
      log.info('result', result);
    }),
    [input],
  );

  return (
    <div>
      <input
        type='text'
        value={input?.blocks[0]?._tag === 'transcript' ? input.blocks[0].text : undefined}
        onChange={(e) =>
          setInput(
            Obj.make(DataType.Message, {
              created: new Date().toISOString(),
              sender: { role: 'user' },
              blocks: [{ _tag: 'transcript', text: e.target.value, started: new Date().toISOString() }],
            }),
          )
        }
      />
      <button onClick={run}>Run</button>
    </div>
  );
};

const DefaultStory = () => {
  const space = useSpace();

  if (!space) {
    return <div>No space</div>;
  }

  return <ExtractionContainer space={space} />;
};

const meta = {
  title: 'plugins/plugin-assistant/EntityExtraction',
  render: DefaultStory,
  decorators: getDecorators({
    config: config.remote,
    onInit: async ({ space }) => {
      await seedTestData(space);
    },
  }),
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
