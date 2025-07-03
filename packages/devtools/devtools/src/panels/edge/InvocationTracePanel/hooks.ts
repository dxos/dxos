//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Obj } from '@dxos/echo';
import {
  ScriptType,
  FunctionType,
  createInvocationSpans,
  type InvocationTraceEvent,
  InvocationOutcome,
} from '@dxos/functions';
import { type DXN } from '@dxos/keys';
import { Filter, getSpace, useQuery, useQueue, type Space } from '@dxos/react-client/echo';

import { getUuidFromDxn } from './utils';

/**
 * Maps invocation target identifiers to readable script names.
 */
export const useScriptNameResolver = ({ space }: { space?: Space }) => {
  const scripts = useQuery(space, Filter.type(ScriptType));
  const functions = useQuery(space, Filter.type(FunctionType));

  return useCallback(
    (invocationTargetId: DXN | undefined) => {
      if (!invocationTargetId) {
        return undefined;
      }
      const uuidPart = getUuidFromDxn(invocationTargetId);

      const matchingFunction = functions.find((f) => f.name === uuidPart);
      if (matchingFunction) {
        const matchingScript = scripts.find((script) => matchingFunction.source?.target?.id === script.id);
        if (matchingScript) {
          return matchingScript.name;
        }
        return matchingFunction.name;
      }

      return undefined;
    },
    [functions, scripts],
  );
};

export const useInvocationTargetsForScript = (target: Obj.Any | undefined) => {
  const space = Obj.instanceOf(ScriptType, target) ? getSpace(target) : undefined;
  const functions = useQuery(space, Filter.type(FunctionType));

  return useMemo(() => {
    if (!Obj.instanceOf(ScriptType, target)) {
      return undefined;
    }

    return new Set(functions.filter((func) => func.source?.target?.id === target.id).map((func) => func.name));
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
        const targetId = span.invocationTarget.dxn;
        const uuidPart = getUuidFromDxn(targetId);
        return uuidPart ? functionsForScript?.has(uuidPart) : false;
      });
    } else if (target) {
      return invocationSpans.filter((span) => span.invocationTarget.dxn.toString() === Obj.getDXN(target).toString());
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
