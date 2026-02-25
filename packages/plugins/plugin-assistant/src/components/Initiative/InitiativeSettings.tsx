//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Initiative } from '@dxos/assistant-toolkit';
import { type Database, Obj, Query, Ref, Type } from '@dxos/echo';
import { DXN } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { QueueService } from '@dxos/functions';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { MarkdownEditor } from '@dxos/plugin-markdown';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { ButtonGroup, Input } from '@dxos/react-ui';
import { QueueAnnotation } from '@dxos/schema';

import { syncTriggers } from './triggers';

export const InitiativeSettings = ({ subject: initiative }: SurfaceComponentProps<Initiative.Initiative>) => {
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);

  const handleResetHistory = useCallback(async () => {
    const runtime = computeRuntime.getRuntime(Obj.getDatabase(initiative)!.spaceId);

    await runtime.runPromise(Initiative.resetChatHistory(initiative));

    if (!initiative.queue) {
      await runtime.runPromise(
        Effect.gen(function* () {
          const queue = yield* QueueService.createQueue();
          Obj.change(initiative, (initiative) => {
            initiative.queue = Ref.fromDXN(queue.dxn);
          });
        }),
      );
    }
  }, [initiative, computeRuntime]);

  const spec = useAtomValue(AtomRef.make(initiative.spec));
  const [specInitialValue] = useObject(spec, 'content');

  useEffect(() => {
    return Obj.subscribe(initiative, () => {
      queueMicrotask(() => syncTriggers(initiative));
    });
  }, [initiative]);

  const subscribableSchemaList = useSchemaList(Obj.getDatabase(initiative)).filter(
    (schema) =>
      QueueAnnotation.get(schema).pipe(Option.isSome) && Type.getTypename(schema) !== Initiative.Initiative.typename,
  );
  const subscribableObjects = useQuery(
    Obj.getDatabase(initiative),
    subscribableSchemaList.length === 0
      ? Query.select(Filter.nothing())
      : Query.all(...subscribableSchemaList.map((schema) => Query.select(Filter.type(schema)))),
  );

  const existingSubscripts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(initiative).pipe((_) =>
          Atom.make((get) => {
            const initative = get(_);
            const selectedSubscriptions: Obj.Unknown[] = subscribableObjects.filter((object) =>
              initiative.subscriptions.some((subscription) => DXN.equals(subscription.dxn, Obj.getDXN(object))),
            );

            return selectedSubscriptions;
          }),
        ),
      [initiative, subscribableObjects],
    ),
  );

  return (
    <div className='flex flex-col gap-4'>
      <Input.Root>
        <Input.Label>Spec (what is the goal of the initiative?)</Input.Label>
        <MarkdownEditor.Root id={spec?.id ?? ''} object={spec}>
          <MarkdownEditor.Content initialValue={specInitialValue} />
        </MarkdownEditor.Root>
      </Input.Root>
      <ButtonGroup classNames='h-10'>
        <Button onClick={handleResetHistory}>Reset Chat History</Button>
      </ButtonGroup>
      {subscribableObjects.length > 0 && (
        <div>
          <p>Subscriptions</p>
          <div>
            {subscribableObjects.map((object) => (
              <Input.Root key={object.id}>
                <Input.Checkbox
                  checked={existingSubscripts.includes(object)}
                  onCheckedChange={(checked) => {
                    Obj.change(initiative, (initiative) => {
                      if (checked) {
                        initiative.subscriptions.push(Ref.fromDXN(Obj.getDXN(object)));
                      } else {
                        initiative.subscriptions = initiative.subscriptions.filter(
                          (subscription) => !DXN.equals(subscription.dxn, Obj.getDXN(object)),
                        );
                      }
                    });
                  }}
                />
                <Input.Label>{Obj.getLabel(object)}</Input.Label>
              </Input.Root>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InitiativeSettings;

const EMPTY_ARRAY: never[] = [];

/**
 * Subscribe to and retrieve schema changes from a space's schema registry.
 */
export const useSchemaList = <T extends Type.Entity.Any = Type.Entity.Any>(
  db?: Database.Database,
  typename?: string,
): T[] => {
  const { subscribe, getSchema } = useMemo(() => {
    if (!db) {
      return {
        subscribe: () => () => {},
        getSchema: () => EMPTY_ARRAY,
      };
    }

    const query = db.schemaRegistry.query({ typename, location: ['database', 'runtime'] });
    const initialResult = query.runSync();
    let currentSchema = initialResult;

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = query.subscribe(() => {
          currentSchema = query.results;
          onStoreChange();
        });

        return unsubscribe;
      },
      getSchema: () => currentSchema,
    };
  }, [typename, db]);

  return useSyncExternalStore(subscribe, getSchema) as T[];
};
