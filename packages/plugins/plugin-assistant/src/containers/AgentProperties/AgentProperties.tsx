//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Agent, SyncTriggers } from '@dxos/assistant-toolkit';
import { Database, DXN, Feed, Obj, Ref } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { createDocAccessor } from '@dxos/echo-db';
import { QueueService } from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
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

export type AgentPropertiesProps = AppSurface.ObjectPropertiesProps<
  Agent.Agent,
  {
    onReset?: () => void;
  }
>;

export const AgentProperties = ({ subject: agent, onReset }: AgentPropertiesProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(agent);

  const spaceId = Obj.getDatabase(agent)?.spaceId;

  const resetHistory = useSpaceCallback(
    spaceId,
    [QueueService, Feed.FeedService, Database.Service] as const,
    Effect.fnUntraced(function* () {
      yield* Agent.resetChatHistory(agent);
      if (!agent.queue) {
        const queue = yield* QueueService.createQueue();
        Obj.change(agent, (agent) => {
          agent.queue = Ref.fromDXN(queue.dxn);
        });
      }
    }),
    [agent],
  );

  const handleResetHistory = useCallback(async () => {
    await resetHistory();
  }, [resetHistory]);

  const syncTriggers = useSpaceCallback(
    spaceId,
    [] as const,
    () => Operation.invoke(SyncTriggers, { agent: Ref.make(agent) }),
    [agent],
  );

  useEffect(() => {
    if (!db) {
      return;
    }

    return Obj.subscribe(agent, () => {
      queueMicrotask(() => {
        syncTriggers().catch((err) => log.catch(err));
      });
    });
  }, [agent, syncTriggers]);

  // Build a filter matching objects of any schema annotated as a feed.
  const feedFilter = useMemo(() => {
    if (!db) {
      return Filter.nothing();
    }

    const schemas = db.schemaRegistry.query({ location: ['database', 'runtime'] }).runSync();
    const feedSchemas = schemas.filter((schema) => {
      const annotation = FeedAnnotation.get(schema);
      return Option.isSome(annotation) && annotation.value === true;
    });

    return feedSchemas.length === 0 ? Filter.nothing() : Filter.or(...feedSchemas.map((schema) => Filter.type(schema)));
  }, [db]);

  const subscribedObjects = useQuery(db, feedFilter);

  // Query all existing subscriptions (e.g., mail, calendar, etc.)
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

  // Create/remove agent subscription.
  const handleSubscriptionChange = useCallback(
    (object: Obj.Unknown, checked: boolean) => {
      Obj.change(agent, (agent) => {
        if (checked) {
          agent.subscriptions.push(Ref.fromDXN(Obj.getDXN(object)));
        } else {
          agent.subscriptions = agent.subscriptions.filter(
            (subscription) => !DXN.equals(subscription.dxn, Obj.getDXN(object)),
          );
        }
      });
    },
    [agent],
  );

  const instructions = useAtomValue(AtomRef.make(agent.instructions));
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
                    handleSubscriptionChange(object, checked === true);
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
      {onReset && (
        <Button
          classNames='mt-form-gap'
          onClick={async () => {
            await handleResetHistory();
            onReset();
          }}
        >
          {t('reset-history.button')}
        </Button>
      )}
    </div>
  );
};
