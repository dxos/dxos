//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { type Agent } from '@dxos/assistant-toolkit';
import * as Trigger from '@dxos/compute/Trigger';
import { Filter, Obj, Ref, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { URI } from '@dxos/keys';
import { Input, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';
import { FeedAnnotation } from '@dxos/schema';

import { meta } from '#meta';

/** Mirrors the foreign keys stamped by the agent-wizard automation compiler (`sync-automation`). */
const AGENT_TRIGGER_EXTENSION_KEY = 'org.dxos.extension.AgentTrigger';
const AGENT_TRIGGER_TARGET_EXTENSION_KEY = 'org.dxos.extension.AgentTriggerTarget';

export type AgentPropertiesProps = {
  agent: Agent.Agent;
  /** Invoked with the FULL next subscription set when the user toggles one. */
  onSubscriptionsChanged?: (subscriptions: Ref.Ref<Obj.Unknown>[]) => void;
};

export const AgentProperties = ({ agent, onSubscriptionsChanged }: AgentPropertiesProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(agent);

  // Build a filter matching objects of any schema annotated as a feed.
  const feedFilter = useMemo(() => {
    if (!db) {
      return Filter.nothing();
    }

    const schemas = db.graph.registry.list().filter(Type.isType);
    const feedSchemas = schemas.filter((type) => {
      const annotation = FeedAnnotation.get(Type.getSchema(type));
      return Option.isSome(annotation) && annotation.value === true;
    });

    return feedSchemas.length === 0
      ? Filter.nothing()
      : Filter.or(...feedSchemas.map((schema: Type.AnyEntity) => Filter.type(schema)));
  }, [db]);

  const subscribedObjects = useQuery(db, feedFilter);

  // The subscription state lives on the compiled automation (routine triggers), not the agent:
  // a trigger's target foreign key holds the subscribed object's URI (`timer:` keys are schedules).
  const triggers = useQuery(
    db,
    Filter.foreignKeys(Trigger.Trigger, [{ source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id }]),
  );
  const subscribedUris = useMemo(
    () =>
      new Set(
        triggers
          .map(
            (trigger) => Obj.getMeta(trigger).keys.find((key) => key.source === AGENT_TRIGGER_TARGET_EXTENSION_KEY)?.id,
          )
          .filter((id): id is string => id !== undefined && !id.startsWith('timer:')),
      ),
    [triggers],
  );

  // Toggle recompiles the full subscription set (see `sync-automation`'s per-category reconcile).
  const handleSubscriptionChange = useCallback(
    (object: Obj.Unknown, checked: boolean) => {
      const next = new Set(subscribedUris);
      const uri = Obj.getURI(object);
      if (checked) {
        next.add(uri);
      } else {
        next.delete(uri);
      }
      onSubscriptionsChanged?.([...next].map((subscription) => Ref.fromURI(URI.make(subscription))));
    },
    [subscribedUris, onSubscriptionsChanged],
  );

  if (subscribedObjects.length === 0) {
    return null;
  }

  return (
    <Form.Section>
      <Input.Root>
        <Input.Label classNames='mt-form-gap'>{t('subscriptions.label')}</Input.Label>
      </Input.Root>

      {subscribedObjects.map((object) => (
        <Input.Root key={object.id}>
          <div className='flex items-center gap-2'>
            <Input.Checkbox
              checked={subscribedUris.has(Obj.getURI(object))}
              onCheckedChange={(checked) => {
                handleSubscriptionChange(object, checked === true);
              }}
            />
            <Input.Label>{Obj.getLabel(object) ?? object.id}</Input.Label>
          </div>
        </Input.Root>
      ))}
    </Form.Section>
  );
};
