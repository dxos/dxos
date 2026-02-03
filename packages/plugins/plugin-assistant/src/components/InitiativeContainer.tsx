import React, { ChangeEvent, useCallback, useMemo, useState } from 'react';
import { controlItemClasses, ControlItemInput, Form, FormFieldMap, omitId } from '@dxos/react-ui-form';
import { Initiative } from '@dxos/assistant-toolkit';
import { StackItem } from '@dxos/react-ui-stack';
import { Icon, IconButton, Input, Popover, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Surface } from '@dxos/app-framework/react';
import { Atom, useAtom, useAtomValue } from '@effect-atom/atom-react';
import { AtomObj, AtomRef } from '@dxos/echo-atom';
import { Match, Record, Schema } from 'effect';
import { DXN, Filter, Obj, Ref } from '@dxos/echo';
import { FunctionDefinition, Trigger } from '@dxos/functions';
import { createObject, type JsonPath, splitJsonPath } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';
import { Editor } from '@dxos/react-ui-editor';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';
import { MarkdownEditor } from '@dxos/plugin-markdown';
import { useObject } from '@dxos/react-client/echo';

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
      {selectedTab === TAB_CHAT && <Surface role='article' data={{ subject: chat }} limit={1} />}
      {selectedArtifact && <Surface role='section' data={{ subject: selectedArtifact.data }} limit={1} />}
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

  // TODO(dmaretskyi): Form breaks if we provide the echo object directly.
  const spreadValue = useMemo(() => ({ ...initiative }), [initiative]);
  return (
    <Form.Root
      schema={omitId(Initiative.Initiative)}
      onValuesChanged={handleChange as any}
      values={spreadValue}
      db={Obj.getDatabase(initiative)}
      fieldMap={fieldMap}
    >
      <Form.FieldSet />
    </Form.Root>
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
    if (!exists) {
      db.remove(trigger);
    }
  }

  // Add triggers that are not in the database.
  for (const subscription of initiative.subscriptions) {
    const relevantTrigger = triggers.find((trigger) =>
      Obj.getKeys(trigger, INITIATIVE_TRIGGER_TARGET_EXTENSION_KEY).some((key) => key.id === subscription.target),
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
        function: Ref.make(FunctionDefinition.serialize(Initiative.agent)),
        input: {
          initiative: Ref.make(initiative),
          event: '{{event}}',
        },
      }),
    );
  }

  await db.flush({ indexes: true });
};
