//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Listbox } from '@dxos/react-ui-list';

import { useSnapshot } from './ServicesContext.tsx';

const MAX_CALLS = 6;

export type CallLogProps = {
  /** The contract whose calls are listed. */
  contractKey: string;
};

/** A consumer's latest calls of one contract, each with the route that carried it. */
export const CallLog = ({ contractKey }: CallLogProps) => {
  const snapshot = useSnapshot();
  const name = contractKey.split('.').pop();
  const calls = snapshot.calls
    .filter((call) => call.key === contractKey)
    .slice(0, MAX_CALLS)
    .map((call, index) => ({
      value: `${call.at}-${index}`,
      label: call.member,
      description: `via ${call.binding.kind} → ${call.binding.hostId}`,
    }));
  return (
    <Listbox.Root items={calls} data-testid={`calls-${name}`}>
      <Listbox.Content>
        <Listbox.ItemGroup>
          <Listbox.ItemGroupLabel>Calls</Listbox.ItemGroupLabel>
          {calls.map((call) => (
            <Listbox.Item key={call.value} id={call.value} />
          ))}
        </Listbox.ItemGroup>
        <Listbox.Empty>None yet</Listbox.Empty>
      </Listbox.Content>
    </Listbox.Root>
  );
};
