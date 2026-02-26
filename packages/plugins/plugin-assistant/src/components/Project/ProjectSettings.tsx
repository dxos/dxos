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
import { Project } from '@dxos/assistant-toolkit';
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

export const ProjectSettings = ({ subject: project }: SurfaceComponentProps<Project.Project>) => {
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);

  const handleResetHistory = useCallback(async () => {
    const runtime = computeRuntime.getRuntime(Obj.getDatabase(project)!.spaceId);

    await runtime.runPromise(Project.resetChatHistory(project));

    if (!project.queue) {
      await runtime.runPromise(
        Effect.gen(function* () {
          const queue = yield* QueueService.createQueue();
          Obj.change(project, (project) => {
            project.queue = Ref.fromDXN(queue.dxn);
          });
        }),
      );
    }
  }, [project, computeRuntime]);

  const spec = useAtomValue(AtomRef.make(project.spec));
  const [specInitialValue] = useObject(spec, 'content');

  useEffect(() => {
    return Obj.subscribe(project, () => {
      queueMicrotask(() => syncTriggers(project));
    });
  }, [project]);

  const subscribableSchemaList = useSchemaList(Obj.getDatabase(project)).filter(
    (schema) =>
      QueueAnnotation.get(schema).pipe(Option.isSome) && Type.getTypename(schema) !== Project.Project.typename,
  );
  const subscribableObjects = useQuery(
    Obj.getDatabase(project),
    subscribableSchemaList.length === 0
      ? Query.select(Filter.nothing())
      : Query.all(...subscribableSchemaList.map((schema) => Query.select(Filter.type(schema)))),
  );

  const existingSubscripts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(project).pipe((_) =>
          Atom.make((get) => {
            const initative = get(_);
            const selectedSubscriptions: Obj.Unknown[] = subscribableObjects.filter((object) =>
              project.subscriptions.some((subscription) => DXN.equals(subscription.dxn, Obj.getDXN(object))),
            );

            return selectedSubscriptions;
          }),
        ),
      [project, subscribableObjects],
    ),
  );

  return (
    <div className='flex flex-col gap-4'>
      <Input.Root>
        <Input.Label>Spec (what is the goal of the project?)</Input.Label>
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
                    Obj.change(project, (project) => {
                      if (checked) {
                        project.subscriptions.push(Ref.fromDXN(Obj.getDXN(object)));
                      } else {
                        project.subscriptions = project.subscriptions.filter(
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

export default ProjectSettings;

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
