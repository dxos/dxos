//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useState } from 'react';

import { Identity } from '@dxos/halo';
import { useCredentials, useHaloServices } from '@dxos/halo-react';

import { Copyable } from './ui.tsx';

/** Your recovery codes: make one, see the ones that work, and revoke one. */
export const Recovery = () => {
  const services = useHaloServices();
  // #region list
  /** The recovery credentials that still work, re-rendering on each change. */
  const codes = useCredentials().flatMap(({ recovery, issuanceDate }) =>
    recovery && !recovery.revoked ? [{ ...recovery, issuanceDate }] : [],
  );
  // #endregion
  const [created, setCreated] = useState<string>();
  const [error, setError] = useState<string>();

  // #region create
  /** Makes a recovery code, and shows it. HALO returns it only this once. */
  const handleCreate = () =>
    Effect.gen(function* () {
      const { recoveryCode } = yield* Identity.createRecoveryCredential();
      return recoveryCode;
    })
      .pipe(Effect.provide(services), Effect.runPromise)
      .then((code) => {
        setError(undefined);
        setCreated(code);
      });
  // #endregion

  // #region revoke
  /** Revokes the recovery credential with `lookupKey`. */
  const handleRevoke = (lookupKey: string) =>
    Identity.revokeRecoveryCredential(lookupKey)
      .pipe(Effect.provide(services), Effect.runPromise)
      .then(
        () => setError(undefined),
        (error) =>
          setError(
            codes.length === 1
              ? 'HALO will not revoke your last recovery code. Make another one first.'
              : String(error),
          ),
      );
  // #endregion

  return (
    <>
      {created && (
        <div className='cb-panel'>
          <p>Write this down. It is shown only once:</p>
          <Copyable value={created} />
        </div>
      )}
      <ul className='cb-list'>
        {codes.map(({ lookupKey, label, kind, issuanceDate }) => (
          <li key={lookupKey} className='cb-item'>
            <span>
              {label ?? kind}
              {issuanceDate && (
                <span className='cb-muted'>
                  {' '}
                  made {issuanceDate.toLocaleString()}
                </span>
              )}
            </span>
            {lookupKey && (
              <button
                className='cb-button'
                onClick={() => handleRevoke(lookupKey)}
              >
                Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className='cb-error'>{error}</p>}
      <button className='cb-button' onClick={handleCreate}>
        Make a recovery code
      </button>
    </>
  );
};
