//
// Copyright 2026 DXOS.org
//

import { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type Operation } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Integration } from '@dxos/plugin-integration';
import { useQuery } from '@dxos/react-client/echo';
/**
 * Find the `Integration` whose `targets` include the given `target` object.
 * Returns the matching integration (or `undefined` if none exists).
 */
export const useTargetIntegration = <T extends Obj.Any>(
  target: T | undefined,
): { integration: Integration.Integration | undefined } => {
  const db = target ? Obj.getDatabase(target) : undefined;
  const integrations = useQuery(db, Filter.type(Integration.Integration));
  const integration = target
    ? integrations.find((candidate) =>
        candidate.targets.some(
          (entry) => entry.object && EID.getEntityId(EID.tryParse(entry.object.uri)!) === target.id,
        ),
      )
    : undefined;
  return { integration };
};

/**
 * Build a `sync` callback that invokes `operation` with
 * `{ integration, [targetKey]: target }` payload and tracks an in-flight
 * `syncing` flag, so the empty-state UI can render a spinner / disabled
 * button without each callsite repeating the boilerplate.
 *
 * Used by `InitializeMailboxAction` (`targetKey='mailbox'`) and
 * `InitializeCalendarAction` (`targetKey='calendar'`).
 */
export const useTargetSync = <T extends Obj.Any>(
  target: T,
  operation: Operation.Definition<any, any>,
  targetKey: string,
  notify?: Operation.NotifyOptions,
): {
  integration: Integration.Integration | undefined;
  sync: () => Promise<void>;
  syncing: boolean;
} => {
  const { integration } = useTargetIntegration(target);
  const { invokePromise } = useOperationInvoker();
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    if (!integration) {
      return;
    }
    setSyncing(true);
    try {
      await invokePromise(
        operation,
        {
          integration: Ref.make(integration),
          [targetKey]: Ref.make(target),
        },
        { spaceId: Obj.getDatabase(target)?.spaceId, notify },
      );
    } finally {
      setSyncing(false);
    }
  }, [invokePromise, integration, operation, target, targetKey, notify]);

  return { integration, sync, syncing };
};
