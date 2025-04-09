//
// Copyright 2025 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { decodeReference } from '@dxos/echo-protocol';
import { ScriptType, FunctionType, createInvocationSpans, type InvocationTraceEvent } from '@dxos/functions/types';
import { type DXN } from '@dxos/keys';
import { Filter, getSpace, useQuery, useQueue, type Space } from '@dxos/react-client/echo';

export const useScriptNameResolver = ({ space }: { space?: Space }) => {
  const scripts = useQuery(space, Filter.schema(ScriptType));
  const functions = useQuery(space, Filter.schema(FunctionType));

  return useCallback(
    (invocationTargetId: DXN | undefined) => {
      if (!invocationTargetId) {
        return undefined;
      }

      const dxnParts = invocationTargetId.toString().split(':');
      const uuidPart = dxnParts[dxnParts.length - 1];

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

export const useInvocationTargetsForScript = (script: ScriptType | undefined) => {
  const space = getSpace(script);
  const functions = useQuery(space, Filter.schema(FunctionType));

  return useMemo(() => {
    if (!script) {
      return undefined;
    }

    return new Set(functions.filter((func) => func.source?.target?.id === script.id).map((func) => func.name));
  }, [functions, script]);
};

export const useInvocationSpans = ({ space, script }: { space?: Space; script?: ScriptType }) => {
  const functionsForScript = useInvocationTargetsForScript(script);
  const invocationsQueue = useQueue<InvocationTraceEvent>(space?.properties.invocationTraceQueue?.dxn, {
    pollInterval: 1000,
  });
  const invocationSpans = useMemo(() => createInvocationSpans(invocationsQueue?.items), [invocationsQueue?.items]);
  const scopedInvocationSpans = useMemo(() => {
    if (functionsForScript) {
      return invocationSpans.filter((span) => {
        const targetId = decodeReference(span.invocationTarget).dxn?.toString();
        const dxnParts = targetId?.toString().split(':');
        const uuidPart = dxnParts?.at(-1);
        return uuidPart ? functionsForScript?.has(uuidPart) : false;
      });
    }
    return invocationSpans;
  }, [invocationSpans]);

  return scopedInvocationSpans;
};
