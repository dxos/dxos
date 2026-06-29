//
// Copyright 2025 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { Operation, Script } from '@dxos/compute';
import { type Database, Filter, Obj } from '@dxos/echo';
import { getUserFunctionIdInMetadata } from '@dxos/functions';
import { type InvocationSpan } from '@dxos/functions-runtime';
import { type URI } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';

import { getUuidFromDXN } from './utils';

/**
 * Maps invocation target identifiers to readable script names.
 */
export const useFunctionNameResolver = ({ db }: { db?: Database.Database }) => {
  const functions = useQuery(db, Filter.type(Operation.PersistentOperation));

  return useCallback(
    (invocationTargetId: URI.URI | undefined) => {
      if (!invocationTargetId) {
        return undefined;
      }
      const uuidPart = getUuidFromDXN(invocationTargetId);

      const matchingFunction = functions.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === uuidPart);
      return matchingFunction?.name;
    },
    [functions],
  );
};

export const useInvocationTargetsForScript = (target: Obj.Unknown | undefined) => {
  const db = Obj.instanceOf(Script.Script, target) ? Obj.getDatabase(target) : undefined;
  const functions = useQuery(db, Filter.type(Operation.PersistentOperation));

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

// TODO(dmaretskyi): Per-invocation trace event feeds are deprecated and no
// longer functional; this hook returns an empty span list until a replacement
// tracing data structure lands.
export const useInvocationSpans = (_args: { feedDXN?: URI.URI; target?: Obj.Unknown }): InvocationSpan[] => [];
