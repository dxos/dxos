//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as EFn from 'effect/Function';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { Filter, Obj, Tag } from '@dxos/echo';
import { Function, Script, Trigger } from '@dxos/functions';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { useTypeOptions } from '@dxos/plugin-space';
import { type Client, useClient } from '@dxos/react-client';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Clipboard, IconButton, Input, Separator, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ControlItem, controlItemClasses } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { Project } from '@dxos/types';
import { ghostHover, mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';
import { TriggerEditor, type TriggerEditorProps } from '../TriggerEditor';

const grid = 'grid grid-cols-[40px_1fr_32px_32px] min-bs-[2.5rem]';

export type AutomationPanelProps = ThemedClassName<{
  space: Space;
  object?: Obj.Any;
  initialTrigger?: Trigger.Trigger;
  onDone?: () => void;
}>;

// TODO(burdon): Factor out common layout with ViewEditor.
export const AutomationPanel = ({ classNames, space, object, initialTrigger, onDone }: AutomationPanelProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const functionsServiceClient = useMemo(() => FunctionsServiceClient.fromClient(client), [client]);
  const functions = useQuery(space.db, Filter.type(Function.Function));
  const triggers = useQuery(space.db, Filter.type(Trigger.Trigger));
  const filteredTriggers = useMemo(() => {
    return object ? triggers.filter(triggerMatch(object)) : triggers;
  }, [object, triggers]);
  const tags = useQuery(space.db, Filter.type(Tag.Tag));
  const types = useTypeOptions({
    space,
    annotation: {
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered'],
    },
  });

  const [trigger, setTrigger] = useState<Trigger.Trigger | undefined>(initialTrigger);
  const [selected, setSelected] = useState<Trigger.Trigger>();

  const handleSelect = (trigger: Trigger.Trigger) => {
    setTrigger(trigger);
    setSelected(trigger);
  };

  const handleAdd = () => {
    setTrigger(Trigger.make({}));
    setSelected(undefined);
  };

  const handleDelete = (trigger: Trigger.Trigger) => {
    space.db.remove(trigger);
    setTrigger(undefined);
    setSelected(undefined);
  };

  const handleSave: TriggerEditorProps['onSave'] = (trigger) => {
    if (selected) {
      Object.assign(selected, trigger);
    } else {
      space.db.add(Trigger.make(trigger));
    }

    setTrigger(undefined);
    setSelected(undefined);
    onDone?.();
  };

  const handleCancel: TriggerEditorProps['onCancel'] = () => {
    setTrigger(undefined);
    onDone?.();
  };

  const handleForceRunTrigger = async (trigger: Trigger.Trigger) => {
    await functionsServiceClient.forceRunCronTrigger(space.id, trigger.id);
  };

  if (trigger) {
    return (
      <ControlItem title={t('trigger editor title')}>
        <TriggerEditor
          db={space.db}
          trigger={trigger}
          readonlySpec={Boolean(object)}
          tags={tags}
          types={types}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </ControlItem>
    );
  }

  return (
    <div className={mx(controlItemClasses, classNames)}>
      {filteredTriggers.length > 0 && (
        <List.Root<Trigger.Trigger>
          items={filteredTriggers}
          isItem={Schema.is(Trigger.Trigger)}
          getId={(field) => field.id}
        >
          {({ items: filteredTriggers }) => (
            <div role='list' className='flex flex-col is-full'>
              {filteredTriggers?.map((trigger) => {
                const copyAction = getCopyAction(client, trigger);
                return (
                  <List.Item<Trigger.Trigger>
                    key={trigger.id}
                    item={trigger}
                    classNames={mx(grid, ghostHover, 'items-center', 'pli-2')}
                  >
                    <Input.Root>
                      <Input.Switch
                        checked={trigger.enabled}
                        onCheckedChange={(checked) => (trigger.enabled = checked)}
                      />
                    </Input.Root>

                    <div className={'flex'}>
                      <List.ItemTitle
                        classNames='pli-1 cursor-pointer is-0 shrink truncate'
                        onClick={() => handleSelect(trigger)}
                      >
                        {getFunctionName(functions, trigger) ?? '∅'}
                      </List.ItemTitle>

                      {/* TODO: a better way to expose copy action */}
                      {copyAction && (
                        <Clipboard.IconButton
                          label={t(copyAction.translationKey)}
                          value={copyAction.contentProvider()}
                        />
                      )}
                    </div>

                    <List.ItemButton
                      autoHide={false}
                      disabled={!trigger.enabled || trigger.spec?.kind !== 'timer'}
                      icon='ph--play--regular'
                      label='Force run'
                      onClick={() => handleForceRunTrigger(trigger)}
                    />

                    <List.ItemDeleteButton onClick={() => handleDelete(trigger)} />
                  </List.Item>
                );
              })}
            </div>
          )}
        </List.Root>
      )}
      {filteredTriggers.length > 0 && <Separator classNames='mlb-4' />}
      <IconButton icon='ph--plus--regular' label={t('new trigger label')} onClick={handleAdd} />
    </div>
  );
};

const getCopyAction = (client: Client, trigger: Trigger.Trigger | undefined) => {
  if (trigger?.spec?.kind === 'email') {
    return {
      translationKey: 'trigger copy email',
      contentProvider: () => `${Obj.getDatabase(trigger)!.spaceId}@dxos.network`,
    };
  }

  if (trigger?.spec?.kind === 'webhook') {
    return { translationKey: 'trigger copy url', contentProvider: () => getWebhookUrl(client, trigger) };
  }

  return undefined;
};

const getWebhookUrl = (client: Client, trigger: Trigger.Trigger) => {
  const spaceId = Obj.getDatabase(trigger)!.spaceId;
  const edgeUrl = new URL(client.config.values.runtime!.services!.edge!.url!);
  const isSecure = edgeUrl.protocol.startsWith('https') || edgeUrl.protocol.startsWith('wss');
  edgeUrl.protocol = isSecure ? 'https' : 'http';
  return new URL(`/webhook/${spaceId}:${trigger.id}`, edgeUrl).toString();
};

const getFunctionName = (functions: Function.Function[], trigger: Trigger.Trigger) => {
  // TODO(wittjosiah): Truncation should be done in the UI.
  //   Warning that the List component is currently a can of worms.
  const shortId = trigger.function && `${trigger.function.dxn.toString().slice(0, 16)}…`;
  const functionObject = functions.find((fn) => fn === trigger.function?.target);
  return functionObject?.name ?? shortId;
};

const scriptMatch = (script: Script.Script) => (trigger: Trigger.Trigger) => {
  const fn = trigger.function?.target;
  if (!Obj.instanceOf(Function.Function, fn)) {
    return false;
  }

  return fn.source?.target === script;
};

const projectMatch = (project: Project.Project) => {
  const viewQueries = EFn.pipe(
    project.columns,
    Array.map((column) => column.view.target),
    Array.filter(isNonNullable),
    Array.map((view) => Obj.getSnapshot(view).query.ast),
    Array.map((ast) => JSON.stringify(ast)),
  );

  return (trigger: Trigger.Trigger) => {
    const spec = Obj.getSnapshot(trigger).spec;
    if (spec?.kind !== 'subscription') {
      return false;
    }

    // TODO(wittjosiah): Implement better way of comparing query ASTs.
    return viewQueries.some((query) => JSON.stringify(spec.query) === query);
  };
};

const triggerMatch = Match.type<Obj.Any>().pipe(
  Match.withReturnType<(trigger: Trigger.Trigger) => boolean>(),
  Match.when(
    (obj) => Obj.instanceOf(Script.Script, obj),
    (obj) => scriptMatch(obj),
  ),
  Match.when(
    (obj) => Obj.instanceOf(Project.Project, obj),
    (obj) => projectMatch(obj),
  ),
  Match.orElse((_obj) => () => true),
);
