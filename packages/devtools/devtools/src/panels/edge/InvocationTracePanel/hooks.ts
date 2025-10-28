//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import {
  Function,
  InvocationOutcome,
  type InvocationTraceEvent,
  Script,
  createInvocationSpans,
  getUserFunctionIdInMetadata,
} from '@dxos/functions';
import { type DXN } from '@dxos/keys';
import { Filter, type Space, getSpace, useQuery, useQueue } from '@dxos/react-client/echo';

import { getUuidFromDxn } from './utils';

/**
 * Maps invocation target identifiers to readable script names.
 */
export const useFunctionNameResolver = ({ space }: { space?: Space }) => {
  const functions = useQuery(space, Filter.type(Function.Function));

  return useCallback(
    (invocationTargetId: DXN | undefined) => {
      if (!invocationTargetId) {
        return undefined;
      }
      const uuidPart = getUuidFromDxn(invocationTargetId);

      const matchingFunction = functions.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === uuidPart);
      return matchingFunction?.name;
    },
    [functions],
  );
};

export const useInvocationTargetsForScript = (target: Obj.Any | undefined) => {
  const space = Obj.instanceOf(Script.Script, target) ? getSpace(target) : undefined;
  const functions = useQuery(space, Filter.type(Function.Function));

  return useMemo(() => {
    if (!Obj.instanceOf(Script.Script, target)) {
      return undefined;
    }

    return new Set(
      functions
        .filter((fn) => fn.source?.target?.id === target.id)
        .map((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn))),
    );
  }, [functions, target]);
};

export const useInvocationSpans = ({ space, target }: { space?: Space; target?: Obj.Any }) => {
  const functionsForScript = useInvocationTargetsForScript(target);
  const invocationsQueue = useQueue<InvocationTraceEvent>(space?.properties.invocationTraceQueue?.dxn, {
    pollInterval: 1000,
  });
  const invocationSpans = useMemo(() => createInvocationSpans(invocationsQueue?.objects), [invocationsQueue?.objects]);
  const scopedInvocationSpans = useMemo(() => {
    if (functionsForScript) {
      return invocationSpans.filter((span) => {
        if (!span.invocationTarget) {
          return false;
        }
        const targetId = span.invocationTarget.dxn;
        const uuidPart = getUuidFromDxn(targetId);
        return uuidPart ? functionsForScript?.has(uuidPart) : false;
      });
    } else if (target) {
      return invocationSpans.filter((span) => span.invocationTarget?.dxn.toString() === Obj.getDXN(target).toString());
    }
    return invocationSpans;
  }, [functionsForScript, target, invocationSpans]);

  // If there are any pending spans, update the current time every second.
  const [_, update] = useState({});
  useEffect(() => {
    if (scopedInvocationSpans.some((span) => span.outcome === InvocationOutcome.PENDING)) {
      const interval = setInterval(() => update({}), 1_000);
      return () => clearInterval(interval);
    }
  }, [scopedInvocationSpans]);

  return scopedInvocationSpans;
};
