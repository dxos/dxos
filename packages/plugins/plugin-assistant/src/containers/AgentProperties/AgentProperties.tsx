//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import { useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useMemo } from 'react';

import { useCapability } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Agent, SyncTriggers } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';
import { DXN, Obj, Ref } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { log } from '@dxos/log';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Filter, useQuery } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';
import { FeedAnnotation } from '@dxos/schema';

import { meta } from '#meta';

export type AgentPropertiesProps = AppSurface.ObjectPropertiesProps<Agent.Agent>;

export const AgentProperties = ({ subject: agent }: AgentPropertiesProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(agent);

  // TODO(burdon): Factor out (separate component from container)?
  const computeRuntime = useCapability(AutomationCapabilities.ComputeRuntime);
  useEffect(() => {
    if (!db) {
      return;
    }

    return Obj.subscribe(agent, () => {
      queueMicrotask(() => {
        const runtime = computeRuntime.getRuntime(db.spaceId);
        runtime
          .runPromise(
            Operation.invoke(SyncTriggers, {
              agent: Ref.make(agent),
            }),
          )
          .catch((err) => log.catch(err));
      });
    });
  }, [db, agent, computeRuntime]);

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
      Obj.update(agent, (agent) => {
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

  if (subscribedObjects.length === 0) {
    return null;
  }

  return (
    <div role='none' className='dx-expander flex flex-col'>
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
    </div>
  );
};
