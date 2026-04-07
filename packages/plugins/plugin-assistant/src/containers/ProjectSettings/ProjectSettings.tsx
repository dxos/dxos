//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Project, syncProjectTriggers } from '@dxos/assistant-toolkit';
import { DXN, Obj, Ref } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { QueueService } from '@dxos/functions';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { MarkdownEditor } from '@dxos/plugin-markdown';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { useObject } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { useTranslation, Input } from '@dxos/react-ui';
import { FeedAnnotation } from '@dxos/schema';

import { meta } from '#meta';

export type ProjectSettingsProps = ObjectSurfaceProps<Project.Project>;

export const ProjectSettings = ({ subject: project }: ProjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
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
    const db = Obj.getDatabase(project);
    if (!db) return;
    const runtime = computeRuntime.getRuntime(db.spaceId);
    return Obj.subscribe(project, () => {
      queueMicrotask(() => runtime.runPromise(syncProjectTriggers(project)));
    });
  }, [project, computeRuntime]);

  const db = Obj.getDatabase(project);
  const feedFilter = useMemo(() => {
    if (!db) {
      return Filter.nothing();
    }

    const schemas = db.schemaRegistry.query({ location: ['database', 'runtime'] }).runSync();
    const feedSchemas = schemas.filter((schema) => {
      const annotation = FeedAnnotation.get(schema);
      return Option.isSome(annotation) && annotation.value === true;
    });

    if (feedSchemas.length === 0) {
      return Filter.nothing();
    }

    return Filter.or(...feedSchemas.map((schema) => Filter.type(schema)));
  }, [db]);
  const subscribableObjects = useQuery(db, feedFilter);

  const existingSubscripts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(project).pipe((_) =>
          Atom.make((get) => {
            const project = get(_);
            const selectedSubscriptions: Obj.Unknown[] = subscribableObjects.filter((object) =>
              project.subscriptions.some((subscription) => DXN.equals(subscription.dxn, Obj.getDXN(object))),
            );

            return selectedSubscriptions;
          }),
        ),
      [project, subscribableObjects],
    ),
  );

  // TODO(burdon): Form.
  return (
    <div role='none' className='dx-container grid grid-rows-[min-content_1fr_min-content] gap-2 pb-trim-md'>
      <div role='none' className='flex flex-col'>
        <Input.Root>
          <Input.Label>{t('subscriptions.label')}</Input.Label>
        </Input.Root>
        {subscribableObjects.map((object) => (
          <Input.Root key={object.id}>
            <div className='flex items-center gap-2'>
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
              <Input.Label>{Obj.getLabel(object) ?? t('unnamed-object.label')}</Input.Label>
            </div>
          </Input.Root>
        ))}
      </div>
      <div className='dx-expander flex flex-col'>
        <Input.Root>
          <Input.Label>{t('instructions.label')}</Input.Label>
          <MarkdownEditor.Root id={spec?.id ?? ''} object={spec}>
            <MarkdownEditor.Content initialValue={specInitialValue} />
          </MarkdownEditor.Root>
        </Input.Root>
      </div>
      {/* TODO(burdon): Move into toolbar. */}
      <Button onClick={handleResetHistory}>{t('reset-history.button')}</Button>
    </div>
  );
};
