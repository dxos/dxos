//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useState } from 'react';

import { Identity, Invitation } from '@dxos/halo';
import { useDevices, useHaloServices } from '@dxos/halo-react';

import { Host } from './Invitations.tsx';

/** Your identity's devices, and a way to add another. */
export const Devices = () => {
  const services = useHaloServices();
  const [adding, setAdding] = useState(false);

  // #region share
  /** Starts an invitation for another device of yours, and returns the flow and the code to open there. */
  const handleAdd = () =>
    Effect.gen(function* () {
      const flow = yield* Identity.share({ authMethod: 'shared-secret' });
      const code = yield* Invitation.code(flow);
      return { flow, code };
    }).pipe(Effect.provide(services), Effect.runPromise);
  // #endregion

  // #region list
  /** Your devices, re-rendering on each change. */
  const devices = useDevices();
  // #endregion

  return (
    <>
      <ul className='cb-list'>
        {devices.map((device) => (
          <li key={device.key} className='cb-item'>
            <span>
              {device.label ?? device.platform ?? device.kind ?? 'Device'}
              {device.current && (
                <span className='cb-muted'> (this device)</span>
              )}
            </span>
            <span className='cb-muted'>{device.presence}</span>
          </li>
        ))}
      </ul>
      {adding ? (
        <Host
          start={handleAdd}
          send='Open the contact book on your other device, choose Join your other device, and paste:'
        />
      ) : (
        <button className='cb-button' onClick={() => setAdding(true)}>
          Add a device
        </button>
      )}
    </>
  );
};
