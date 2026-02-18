//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import type * as Record from 'effect/Record';
import React, { useCallback, useMemo, useState } from 'react';

import { Surface, useCapability } from '@dxos/app-framework/ui';
import { Initiative } from '@dxos/assistant-toolkit';
import { DXN, Filter, Obj, Query, Ref } from '@dxos/echo';
import { type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { FunctionDefinition, QueueService, Trigger } from '@dxos/functions';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { MarkdownEditor } from '@dxos/plugin-markdown';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Button, ButtonGroup, IconButton, Input, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Form, type FormFieldMap, omitId } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';
import { type Text } from '@dxos/schema';

export type InitiativeContainerProps = {
  role?: string;
  initiative: Initiative.Initiative;
};

const TAB_INITATIVE = 'Initiative';
const TAB_CHAT = 'Chat';

export const InitiativeContainer = ({ role, initiative }: InitiativeContainerProps) => {
  const [selectedTab, setSelectedTab] = useState<string>(TAB_INITATIVE);

  const tabs = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(initiative).pipe((initiative) =>
          Atom.make((get) => {
            return [TAB_INITATIVE, TAB_CHAT, ...get(initiative).artifacts.map((artifact) => artifact.name)];
          }),
        ),
      [initiative],
    ),
  );

  const chat = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(initiative).pipe((initiative) =>
          Atom.make((get) => {
            const chat = get(initiative).chat;
            return chat ? get(AtomRef.make(chat)) : undefined;
          }),
        ),
      [initiative],
    ),
  );

  const artifacts = useAtomValue(
    useMemo(
      () =>
        AtomObj.make(initiative).pipe((initiative) =>
          Atom.make((get) => {
            return get(initiative).artifacts.map((artifact) => ({
              name: artifact.name,
              data: get(AtomRef.make(artifact.data)),
            }));
          }),
        ),
      [initiative],
    ),
  );

  const selectedArtifact = artifacts.find((artifact) => artifact.name === selectedTab);

  return (
    <StackItem.Content toolbar>
      <div
        role='none'
        className='flex-1 min-is-0 overflow-x-auto scrollbar-none flex gap-1 border-b border-subduedSeparator'
      >
        {tabs.map((tab) => (
          <IconButton
            key={tab}
            icon={Match.value(tab).pipe(
              Match.when(TAB_INITATIVE, () => 'ph--sparkle--regular'),
              Match.when(TAB_CHAT, () => 'ph--chat--regular'),
              Match.orElse(() => 'ph--file--regular'),
            )}
            label={tab}
            variant={selectedTab === tab ? 'primary' : 'ghost'}
            onClick={() => setSelectedTab(tab)}
          />
        ))}
      </div>
      {selectedTab === TAB_INITATIVE && <InitiativeForm initiative={initiative} />}
      {selectedTab === TAB_CHAT && <Surface.Surface role='article' data={{ subject: chat }} limit={1} />}
      {selectedArtifact && <Surface.Surface role='section' data={{ subject: selectedArtifact.data }} limit={1} />}
    </StackItem.Content>
  );
};

export default InitiativeContainer;

const InitiativeForm = ({ initiative }: { initiative: Initiative.Initiative }) => {
  const handleChange = useCallback(
    (
      values: Omit<Initiative.Initiative, 'id'>,
      { isValid, changed }: { isValid: boolean; changed: Record<string, boolean> },
    ) => {
      if (!isValid) {
        return;
      }

      const changedPaths = Object.keys(changed).filter((path) => changed[path as string]) as JsonPath[];
      // Handle other property changes.
      if (changedPaths.length > 0) {
        Obj.change(initiative, () => {
          for (const path of changedPaths) {
            const parts = splitJsonPath(path);
            const value = Obj.getValue(values as any, parts);
            Obj.setValue(initiative, parts, value);
          }
        });
      }

      queueMicrotask(() => syncTriggers(initiative));
    },
    [initiative],
  );

  const fieldMap = useMemo<FormFieldMap>(
    () => ({
      spec: ({ type, label, getValue, onValueChange }) => {
        const { t } = useTranslation();

        const value: Ref.Ref<Text.Text> = getValue();
        const target = useAtomValue(AtomRef.make(value));
        const [initialValue] = useObject(target, 'content');

        return (
          <Input.Root>
            <div role='none'>
              <Input.Label>{toLocalizedString(label, t)}</Input.Label>
            </div>
            <MarkdownEditor.Root id={target?.id ?? ''} object={target}>
              <MarkdownEditor.Content initialValue={initialValue} />
            </MarkdownEditor.Root>
          </Input.Root>
        );
      },
      plan: ({ type, label, getValue, onValueChange }) => {
        const { t } = useTranslation();

        const value: Ref.Ref<Text.Text> = getValue();
        const target = useAtomValue(AtomRef.make(value));
        const [initialValue] = useObject(target, 'content');

        return (
          <Input.Root>
            <div role='none'>
              <Input.Label>{toLocalizedString(label, t)}</Input.Label>
            </div>
            <MarkdownEditor.Root id={target?.id ?? ''} object={target}>
              <MarkdownEditor.Content initialValue={initialValue} />
            </MarkdownEditor.Root>
          </Input.Root>
        );
      },
    }),
    [],
  );

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

  const inputQueue = useAtomValue(
    AtomObj.make(initiative).pipe((_) =>
      Atom.make((get) =>
        Option.fromNullable(get(_).queue).pipe(Option.map(AtomRef.make), Option.map(get), Option.getOrUndefined),
      ),
    ),
  );

  const inputQueueItems = useQuery(inputQueue, Query.select(Filter.everything()));

  // TODO(dmaretskyi): Form breaks if we provide the echo object directly.
  const spreadValue = useMemo(() => ({ ...initiative }), [initiative]);
  return (
    <div className='flex flex-col gap-2'>
      <ButtonGroup classNames='h-10'>
        <Button onClick={handleResetHistory}>Reset History</Button>
      </ButtonGroup>
      <h3 className='mb-2'>Input Queue</h3>
      <div className='border border-subduedSeparator rounded-md p-2 h-64 overflow-y-auto'>
        {inputQueueItems.map((item) => (
          <Surface.Surface key={item.id} role='section' data={{ subject: item }} limit={1} />
        ))}
        {inputQueueItems.length === 0 && <div className='text-subdued'>No items in queue</div>}
      </div>
      <Form.Root
        schema={omitId(Initiative.Initiative)}
        onValuesChanged={handleChange as any}
        values={spreadValue}
        db={Obj.getDatabase(initiative)}
        fieldMap={fieldMap}
      >
        <Form.FieldSet />
      </Form.Root>
    </div>
  );
};

// TODO(dmaretskyi): Perhaps the association is better done with a relation.

/**
 * Foreign key {@link INITIATIVE_TRIGGER_EXTENSION_KEY} => <initative id : ObjectId>
 */
const INITIATIVE_TRIGGER_EXTENSION_KEY = 'dxos.org/extension/InitiativeTrigger';

/**
 * Foreign key {@link INITIATIVE_TRIGGER_EXTENSION_KEY} => <dxn string of subscription target>
 */
const INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY = 'dxos.org/extension/InitiativeTriggerTarget';

/**
 * Syncs triggers in the database with the initiative subscriptions.
 */

const syncTriggers = async (initiative: Initiative.Initiative) => {
  const db = Obj.getDatabase(initiative);
  if (!db) {
    return;
  }

  const triggers = await db
    .query(Filter.foreignKeys(Trigger.Trigger, [{ source: INITIATIVE_TRIGGER_EXTENSION_KEY, id: initiative.id }]))
    .run();

  // Delete triggers that are not in subscriptions.
  for (const trigger of triggers) {
    const target = Obj.getKeys(trigger, INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY).at(0)?.id;

    const exists = initiative.subscriptions.find((subscription) => subscription.dxn.toString() === target);
    if (!exists && !(initiative.useQualifyingAgent && target === Obj.getDXN(initiative)?.toString())) {
      db.remove(trigger);
    }
  }

  // Add triggers that are not in the database.
  for (const subscription of initiative.subscriptions) {
    const relevantTrigger = triggers.find((trigger) =>
      Obj.getKeys(trigger, INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY).some(
        (key) => key.id === subscription.dxn.toString(),
      ),
    );
    if (relevantTrigger) {
      continue;
    }

    const target = await subscription.tryLoad();
    if (!target || !target.queue || !(target.queue.dxn instanceof DXN) || target.queue.dxn.kind !== DXN.kind.QUEUE) {
      continue;
    }

    db.add(
      Trigger.make({
        [Obj.Meta]: {
          keys: [
            { source: INITIATIVE_TRIGGER_EXTENSION_KEY, id: initiative.id },
            { source: INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY, id: subscription.dxn.toString() },
          ],
        },
        enabled: true,
        spec: {
          kind: 'queue',
          queue: target.queue.dxn.toString(),
        },
        function: Ref.make(
          FunctionDefinition.serialize(initiative.useQualifyingAgent ? Initiative.qualifier : Initiative.agent),
        ),
        input: {
          initiative: Ref.make(initiative),
          event: '{{event}}',
        },
      }),
    );
  }

  if (initiative.useQualifyingAgent) {
    const qualifierTrigger = triggers.find((trigger) =>
      Obj.getKeys(trigger, INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY).some(
        (key) => key.id === Obj.getDXN(initiative)?.toString(),
      ),
    );
    if (!qualifierTrigger && initiative.queue) {
      db.add(
        Trigger.make({
          [Obj.Meta]: {
            keys: [
              { source: INITIATIVE_TRIGGER_EXTENSION_KEY, id: initiative.id },
              { source: INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY, id: Obj.getDXN(initiative)?.toString() ?? '' },
            ],
          },
          function: Ref.make(FunctionDefinition.serialize(Initiative.agent)),
          enabled: true,
          spec: {
            kind: 'queue',
            queue: initiative.queue.dxn.toString(),
          },
          input: {
            initiative: Ref.make(initiative),
            event: '{{event}}',
          },
        }),
      );
    }
  }

  await db.flush({ indexes: true });
};
