//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Chain as ChainType } from '@braneframe/types';
import { Input, Select, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { CHAIN_PLUGIN } from '../meta';

const inputTypes = [
  {
    value: ChainType.Input.Type.VALUE,
    label: 'Value',
  },
  {
    value: ChainType.Input.Type.PASS_THROUGH,
    label: 'Pass through',
  },
  {
    value: ChainType.Input.Type.RETRIEVER,
    label: 'Retriever',
  },
  // {
  //   value: ChainType.Input.Type.FUNCTION,
  //   label: 'Function',
  // },
  // {
  //   value: ChainType.Input.Type.QUERY,
  //   label: 'Query',
  // },
  {
    value: ChainType.Input.Type.RESOLVER,
    label: 'Resolver',
  },
  {
    value: ChainType.Input.Type.CONTEXT,
    label: 'Context',
  },
  {
    value: ChainType.Input.Type.SCHEMA,
    label: 'Schema',
  },
];

const getInputType = (type: string) => inputTypes.find(({ value }) => String(value) === type)?.value;

export const InputRow = ({ input }: { input: ChainType.Input }) => {
  const { t } = useTranslation(CHAIN_PLUGIN);
  return (
    <tr key={input.name}>
      <td className='px-3 py-1.5 w-[200px] font-mono text-sm'>{input.name}</td>
      <td className='px-3 py-1.5 w-[160px]'>
        <Input.Root>
          <Select.Root
            value={String(input.type)}
            onValueChange={(type) => {
              input.type = getInputType(type) ?? ChainType.Input.Type.VALUE;
            }}
          >
            <Select.TriggerButton placeholder='Type' classNames='is-full' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  {inputTypes.map(({ value, label }) => (
                    <Select.Option key={value} value={String(value)}>
                      {label}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </Input.Root>
      </td>
      <td className='px-3'>
        {[
          ChainType.Input.Type.VALUE,
          ChainType.Input.Type.CONTEXT,
          ChainType.Input.Type.RESOLVER,
          ChainType.Input.Type.SCHEMA,
        ].includes(input.type) && (
          <Input.Root>
            <Input.TextInput
              placeholder={t('command placeholder')}
              classNames={mx('is-full bg-transparent m-2')}
              value={input.value ?? ''}
              onChange={(event) => {
                input.value = event.target.value;
              }}
            />
          </Input.Root>
        )}
      </td>
    </tr>
  );
};
