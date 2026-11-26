//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Listbox } from '@dxos/react-ui-list';

import { useSnapshot } from './ServicesContext.tsx';

export type CallLogProps = {
  /** The contract whose calls are listed. */
  contractKey: string;
};

/**
 * A consumer's calls of one contract, newest first, each with the route that carried it. It fills the
 * space its panel leaves and scrolls on its own, so the controls above it stay in view.
 */
export const CallLog = ({ contractKey }: CallLogProps) => {
  const snapshot = useSnapshot();
  const name = contractKey.split('.').pop();
  const calls = snapshot.calls
    .filter((call) => call.key === contractKey)
    .map((call, index) => ({
      value: `${call.at}-${index}`,
      label: call.member,
      description: `via ${call.binding.kind} → ${call.binding.hostId}`,
    }));
  return (
    <Listbox.Root items={calls} classNames='dx-grow' data-testid={`calls-${name}`}>
      <Listbox.Label>Calls</Listbox.Label>
      <Listbox.Viewport>
        {/* A list of a fixed height gives its rows no spare room, so each is sized to its two lines. */}
        <Listbox.Content classNames='auto-rows-max'>
          {calls.map((call) => (
            <Listbox.Item key={call.value} id={call.value} />
          ))}
          <Listbox.Empty>None yet</Listbox.Empty>
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};
