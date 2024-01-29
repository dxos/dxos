//
// Copyright 2024 DXOS.org
//

import { Brain } from '@phosphor-icons/react';
import { useToolbarContext } from 'packages/ui/react-ui-editor';
import React from 'react';

import { Select } from '@dxos/react-ui';

const prompts = [
  {
    id: 'test',
  },
];

export const PromptSelector = () => {
  const { onAction } = useToolbarContext('PromptSelector');
  return (
    <Select.Root defaultValue='0' onValueChange={(value) => onAction?.({ type: 'prompt', data: value })}>
      <Select.TriggerButton classNames='p-0'>
        <Brain />
      </Select.TriggerButton>
      <Select.Portal>
        <Select.Content>
          <Select.Viewport>
            {prompts.map(({ id }) => (
              <Select.Option key={id} value={id}>
                {id}
              </Select.Option>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
};
