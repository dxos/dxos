//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Agent, SyncTriggers } from '@dxos/assistant-toolkit';
import { DXN, Obj, Ref } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { createDocAccessor } from '@dxos/echo-db';
import { QueueService } from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Button, Input, useTranslation } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { FeedAnnotation } from '@dxos/schema';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

import { meta } from '#meta';

export type AgentPropertiesProps = AppSurface.ObjectPropertiesProps<Agent.Agent>;

export const AgentProperties = ({ subject: agent }: AgentPropertiesProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(burdon): Factor out.
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  const handleResetHistory = useCallback(async () => {
    const runtime = computeRuntime.getRuntime(Obj.getDatabase(agent)!.spaceId);
    await runtime.runPromise(Agent.resetChatHistory(agent));
    if (!agent.queue) {
      await runtime.runPromise(
        Effect.gen(function* () {
          const queue = yield* QueueService.createQueue();
          Obj.change(agent, (agent) => {
            agent.queue = Ref.fromDXN(queue.dxn);
          });
        }),
      );
    }
  }, [agent, computeRuntime]);

  useEffect(() => {
    const db = Obj.getDatabase(agent);
    if (!db) return;
    return Obj.subscribe(agent, () => {
      queueMicrotask(() => {
        const runtime = computeRuntime.getRuntime(db.spaceId);
        runtime.runPromise(Operation.invoke(SyncTriggers, { agent: Ref.make(agent) })).catch((err) => log.catch(err));
      });
    });
  }, [agent, computeRuntime]);

  const db = Obj.getDatabase(agent);
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
  const subscribedObjects = useQuery(db, feedFilter);

  const existingSubscriptions = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(agent).pipe((_) =>
          Atom.make((get) => {
            const agentObj = get(_);
            const selectedSubscriptions: Obj.Unknown[] = subscribedObjects.filter((object) =>
              agentObj.subscriptions.some((subscription) => DXN.equals(subscription.dxn, Obj.getDXN(object))),
            );

            return selectedSubscriptions;
          }),
        ),
      [agent, subscribedObjects],
    ),
  );

  const instructions = useAtomValue(AtomRef.make(agent.spec));
  const extension = useMemo(
    () =>
      instructions && [
        createBasicExtensions({ placeholder: t('instructions.placeholder') }),
        createThemeExtensions({
          syntaxHighlighting: true,
          slots: {
            content: {
              className: 'mx-0!',
            },
          },
        }),
        createDataExtensions({ id: agent.id, text: createDocAccessor(instructions, ['content']) }),
        createMarkdownExtensions(),
        decorateMarkdown(),
      ],
    [instructions, agent.id, t],
  );

  return (
    <div role='none' className='dx-expander flex flex-col'>
      {subscribedObjects.length > 0 && (
        <>
          <Input.Root>
            <Input.Label classNames='mt-form-gap'>{t('subscriptions.label')}</Input.Label>
          </Input.Root>

          {subscribedObjects.map((object) => (
            <Input.Root key={object.id}>
              <div className='flex items-center gap-2'>
                <Input.Checkbox
                  checked={existingSubscriptions.includes(object)}
                  onCheckedChange={(checked) => {
                    Obj.change(agent, (agent) => {
                      if (checked) {
                        agent.subscriptions.push(Ref.fromDXN(Obj.getDXN(object)));
                      } else {
                        agent.subscriptions = agent.subscriptions.filter(
                          (subscription) => !DXN.equals(subscription.dxn, Obj.getDXN(object)),
                        );
                      }
                    });
                  }}
                />
                <Input.Label>{Obj.getLabel(object) ?? object.id}</Input.Label>
              </div>
            </Input.Root>
          ))}
        </>
      )}

      <Input.Root>
        <Input.Label classNames='mt-form-gap'>{t('instructions.label')}</Input.Label>
        {instructions && (
          <Editor.Root>
            <Editor.View extensions={extension} />
          </Editor.Root>
        )}
      </Input.Root>

      {/* TODO(burdon): Move into toolbar in parent. */}
      <Button classNames='mt-form-gap' onClick={handleResetHistory}>
        {t('reset-history.button')}
      </Button>
    </div>
  );
};
