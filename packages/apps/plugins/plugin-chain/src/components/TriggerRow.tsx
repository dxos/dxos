//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type Chain as ChainType } from '@braneframe/types';
import { Input } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export const TriggerRow = ({ trigger }: { trigger: ChainType.Trigger }) => {
  return (
    <tr key={trigger.typename}>
      <td className='px-3 py-1.5 w-[200px] font-mono text-sm'>{trigger.typename}</td>
      <td className='px-3 py-1.5 w-[160px]'>{trigger.compareBy}</td>
      <td className='px-3 py-1.5'>
        <Input.Root>
          <Input.TextInput
            inputMode={'numeric'}
            classNames={mx('is-full bg-transparent m-2')}
            value={String(trigger.debounceMs) ?? ''}
            onChange={(event) => {
              const parsed = parseInt(event.target.value, 10);
              trigger.debounceMs = Number.isNaN(parsed) ? 0 : parsed;
            }}
          />
        </Input.Root>
      </td>
      <td className='px-3'>
        <Input.Root>
          <Input.Checkbox
            checked={trigger.enabled}
            onCheckedChange={(checked) => {
              trigger.enabled = Boolean(checked);
            }}
          />
        </Input.Root>
      </td>
    </tr>
  );
};
