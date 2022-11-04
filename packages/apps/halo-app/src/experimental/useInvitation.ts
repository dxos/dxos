//
// Copyright 2022 DXOS.org
//

import { useCallback, useReducer, Reducer, useEffect, useState, useMemo } from 'react';

import type { Party, Profile } from '@dxos/client';
import { PublicKey } from '@dxos/client';

export const pause = (duration: number) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve('done');
    }, duration);
  });

type FakeSpace = {
  key: Party['key'];
};

type FakeProfile = {
  publicKey: Profile['publicKey'];
};

export enum InvitationReducerStatus {
  failed = -2,
  cancelled = -1,
  init,
  connecting,
  ready,
  validating,
  done
}

export type InvitationResult = [FakeSpace, FakeProfile];

export interface InvitationReducerState {
  status: InvitationReducerStatus;
  result: [null, null] | InvitationResult;
  secret?: string;
  error?: Error;
}

export type InvitationAction =
  | {
      status:
        | InvitationReducerStatus.init
        | InvitationReducerStatus.connecting
        | InvitationReducerStatus.validating
        | InvitationReducerStatus.cancelled;
    }
  | {
      status: InvitationReducerStatus.ready;
      secret: string;
    }
  | {
      status: InvitationReducerStatus.done;
      result: InvitationResult;
    }
  | {
      status: InvitationReducerStatus.failed;
      error?: Error;
    };

/**
 * THIS IS A PROTOTYPE.
 * It does not function. It gives the UI some fake signals it needs
 * to demonstrate how this function *could* work when implemented
 * in `@dxos/react-client`.
 */
export const useInvitation = (spaceDescriptor: string, identKey: string) => {
  const [state, dispatch] = useReducer<Reducer<InvitationReducerState, InvitationAction>, null>(
    (prev, action) =>
      ({
        status: action.status,
        // `result` and `secret` is persisted between 'done' and 'ready' statuses.
        result: action.status === InvitationReducerStatus.done ? action.result : prev.result,
        secret: action.status === InvitationReducerStatus.ready ? action.secret : prev.secret,
        // `error` gets reset each time we leave the error state.
        ...(action.status === InvitationReducerStatus.failed && { error: action.error })
      } as InvitationReducerState),
    null,
    (arg: null) => {
      return {
        status: InvitationReducerStatus.init,
        result: [null, null],
        error: undefined,
        secret: undefined
      };
    }
  );

  // ===
  // Connect step
  // ===

  const storedConnect = useCallback(async () => {
    await pause(1e3);
    return Math.random().toString(16).slice(2, 6);
  }, [spaceDescriptor, identKey]);

  const [connect] = useState(() => {
    const cancelled: Set<Promise<string> | null> = new Set();
    let previous: Promise<string> | null;

    return Object.assign(
      async () => {
        // Reloading automatically cancels previous promises
        cancelled.add(previous);
        dispatch({ status: InvitationReducerStatus.connecting });
        let current: Promise<string> | null = null;

        try {
          previous = current = storedConnect();
          const secret = await current;
          !cancelled.has(current) && dispatch({ status: InvitationReducerStatus.ready, secret });
        } catch (error) {
          current &&
            !cancelled.has(current) &&
            dispatch({ status: InvitationReducerStatus.failed, error: error as Error });
        } finally {
          cancelled.delete(current);
        }
      },
      {
        cancel: () => {
          cancelled.add(previous);
        }
      }
    );
  });

  // Cancels any pending connect callbacks when the hook unmounts
  useEffect(() => connect.cancel, [connect]);

  // ===
  // Validation step
  // ===

  const storedValidate = useCallback(
    async (secret: string) => {
      await pause(1e3);
      if (secret === state.secret) {
        return [{ key: PublicKey.random() }, { publicKey: PublicKey.random() }] as InvitationResult;
      } else {
        throw new Error('Secret does not match');
      }
    },
    [spaceDescriptor, identKey]
  );

  const [validate] = useState(() => {
    const cancelled: Set<Promise<InvitationResult> | null> = new Set();
    let previous: Promise<InvitationResult> | null;

    return Object.assign(
      async (secret: string) => {
        // Reloading automatically cancels previous promises
        cancelled.add(previous);
        dispatch({ status: InvitationReducerStatus.validating });
        let current: Promise<InvitationResult> | null = null;

        try {
          previous = current = storedValidate(secret);
          const result = await current;
          !cancelled.has(current) && dispatch({ status: InvitationReducerStatus.done, result: result! });
        } catch (error) {
          current &&
            !cancelled.has(current) &&
            dispatch({ status: InvitationReducerStatus.failed, error: error as Error });
        } finally {
          cancelled.delete(current);
        }
      },
      {
        cancel: () => {
          cancelled.add(previous);
        }
      }
    );
  });

  // Cancels any pending validate callbacks when the hook unmounts
  useEffect(() => validate.cancel, [validate]);

  return useMemo(() => {
    return {
      status: state.status,
      result: state.result,
      secret: state.secret,
      error: state.error,
      cancel: () => {
        // Prevent the callbacks from dispatching
        connect.cancel();
        validate.cancel();
        // Set status to cancelled
        dispatch({ status: InvitationReducerStatus.cancelled });
      },
      connect,
      validate
    };
  }, [connect, validate, state]);
};
