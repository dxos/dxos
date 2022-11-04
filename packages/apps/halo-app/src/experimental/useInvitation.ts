//
// Copyright 2022 DXOS.org
//

import { useCallback, useReducer, Reducer, useEffect, useState, useMemo } from 'react';

import { PublicKey } from '@dxos/client';

export const pause = (duration: number) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve('done');
    }, duration);
  });

type FakeSubject = {
  key: PublicKey;
};

type FakeProfile = {
  publicKey: PublicKey;
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

export type InvitationResult = [FakeSubject, FakeProfile];

export interface InvitationReducerState {
  status: InvitationReducerStatus;
  haltedAt?: InvitationReducerStatus;
  result: [null, null] | InvitationResult;
  secret?: string;
  error?: Error;
  subject?: PublicKey;
}

export type InvitationAction =
  | {
      status: InvitationReducerStatus.init | InvitationReducerStatus.validating;
    }
  | {
      status: InvitationReducerStatus.connecting;
      subject: PublicKey;
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
      status: InvitationReducerStatus.cancelled;
      haltedAt: InvitationReducerStatus;
    }
  | {
      status: InvitationReducerStatus.failed;
      error?: Error;
      haltedAt: InvitationReducerStatus;
    };

/**
 * THIS IS A PROTOTYPE.
 * It does not function. It gives the UI some fake signals it needs
 * to demonstrate how this function *could* work when implemented
 * in `@dxos/react-client`.
 */
export const useInvitation = (profileKey: PublicKey) => {
  const [state, dispatch] = useReducer<Reducer<InvitationReducerState, InvitationAction>, null>(
    (prev, action) =>
      ({
        status: action.status,
        // `subject`, `secret`, and `result` is persisted between the status-actions that set them.
        result: action.status === InvitationReducerStatus.done ? action.result : prev.result,
        subject: action.status === InvitationReducerStatus.connecting ? action.subject : prev.subject,
        secret: action.status === InvitationReducerStatus.ready ? action.secret : prev.secret,
        // `error` gets reset each time we leave the error state
        ...(action.status === InvitationReducerStatus.failed && { error: action.error }),
        // `haltedAt` gets reset each time we leave the error or cancelled state
        ...((action.status === InvitationReducerStatus.failed ||
          action.status === InvitationReducerStatus.cancelled) && {
          haltedAt: action.haltedAt
        })
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

  const storedConnect = useCallback(
    async (subjectKey: PublicKey) => {
      await pause(4e3);
      return Math.random().toString(16).slice(2, 6);
    },
    [profileKey]
  );

  const [connect] = useState(() => {
    const cancelled: Set<Promise<string> | null> = new Set();
    let previous: Promise<string> | null;

    return Object.assign(
      async (subjectKey: PublicKey) => {
        // Reloading automatically cancels previous promises
        cancelled.add(previous);
        dispatch({ status: InvitationReducerStatus.connecting, subject: subjectKey });
        let current: Promise<string> | null = null;

        try {
          previous = current = storedConnect(subjectKey);
          const secret = await current;
          !cancelled.has(current) && dispatch({ status: InvitationReducerStatus.ready, secret });
        } catch (error) {
          current &&
            !cancelled.has(current) &&
            dispatch({
              status: InvitationReducerStatus.failed,
              error: error as Error,
              haltedAt: InvitationReducerStatus.connecting
            });
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
      await pause(4e3);
      if (secret === state.secret) {
        return [{ key: state.subject }, { publicKey: profileKey }] as InvitationResult;
      } else {
        throw new Error('Secret does not match');
      }
    },
    [state.secret]
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
            dispatch({
              status: InvitationReducerStatus.failed,
              error: error as Error,
              haltedAt: InvitationReducerStatus.validating
            });
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
      haltedAt: state.haltedAt,
      result: state.result,
      secret: state.secret,
      subject: state.subject,
      error: state.error,
      cancel: () => {
        // Prevent the callbacks from dispatching
        connect.cancel();
        validate.cancel();
        // Set status to cancelled
        dispatch({ status: InvitationReducerStatus.cancelled, haltedAt: state.status });
      },
      connect,
      validate
    };
  }, [connect, validate, state]);
};
