//
// Copyright 2026 DXOS.org
//

import React from 'react';

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
  const calls = snapshot.calls.filter((call) => call.key === contractKey).slice(0, MAX_CALLS);
  return (
    <div className='text-sm space-y-1' data-testid={`calls-${name}`}>
      <div className='font-medium'>Calls</div>
      {calls.length === 0 && <div className='text-fg-muted'>none yet</div>}
      {calls.map((call, index) => (
        <div key={`${call.at}-${index}`} className='text-fg-muted'>
          {call.member} via {call.binding.kind} → {call.binding.hostId}
        </div>
      ))}
    </div>
  );
};
