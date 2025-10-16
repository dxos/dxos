//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as Function from 'effect/Function';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { Filter, Obj, Tag } from '@dxos/echo';
import { FunctionTrigger, FunctionType, ScriptType } from '@dxos/functions';
import { useTypeOptions } from '@dxos/plugin-space';
import { type Client, useClient } from '@dxos/react-client';
import { type Space, getSpace, useQuery } from '@dxos/react-client/echo';
import { Clipboard, IconButton, Input, Separator, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { ControlItem, controlItemClasses } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';

import { meta } from '../../meta';
import { TriggerEditor, type TriggerEditorProps } from '../TriggerEditor';

const grid = 'grid grid-cols-[40px_1fr_32px] min-bs-[2.5rem]';

export type AutomationPanelProps = ThemedClassName<{
  space: Space;
  object?: Obj.Any;
  initialTrigger?: FunctionTrigger;
  onDone?: () => void;
}>;

// TODO(burdon): Factor out common layout with ViewEditor.
export const AutomationPanel = ({ classNames, space, object, initialTrigger, onDone }: AutomationPanelProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const functions = useQuery(space, Filter.type(FunctionType));
  const triggers = useQuery(space, Filter.type(FunctionTrigger));
  const filteredTriggers = useMemo(() => {
    return object ? triggers.filter(triggerMatch(object)) : triggers;
  }, [object, triggers]);
  const tags = useQuery(space, Filter.type(Tag.Tag));
  const types = useTypeOptions({ space, annotation: ['dynamic', 'limited-static', 'object-form'] });

  const [trigger, setTrigger] = useState<FunctionTrigger | undefined>(initialTrigger);
  const [selected, setSelected] = useState<FunctionTrigger>();

  const handleSelect = (trigger: FunctionTrigger) => {
    setTrigger(trigger);
    setSelected(trigger);
  };

  const handleAdd = () => {
    setTrigger(Obj.make(FunctionTrigger, {}));
    setSelected(undefined);
  };

  const handleDelete = (trigger: FunctionTrigger) => {
    space.db.remove(trigger);
    setTrigger(undefined);
    setSelected(undefined);
  };

  const handleSave: TriggerEditorProps['onSave'] = ({ id: _, ...trigger }) => {
    if (selected) {
      Object.assign(selected, trigger);
    } else {
      space.db.add(Obj.make(FunctionTrigger, trigger));
    }

    setTrigger(undefined);
    setSelected(undefined);
    onDone?.();
  };

  const handleCancel: TriggerEditorProps['onCancel'] = () => {
    setTrigger(undefined);
    onDone?.();
  };

  if (trigger) {
    return (
      <ControlItem title={t('trigger editor title')}>
        <TriggerEditor
          space={space}
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
        <List.Root<FunctionTrigger>
          items={filteredTriggers}
          isItem={Schema.is(FunctionTrigger)}
          getId={(field) => field.id}
        >
          {({ items: filteredTriggers }) => (
            <div role='list' className='flex flex-col w-full'>
              {filteredTriggers?.map((trigger) => {
                const copyAction = getCopyAction(client, trigger);
                return (
                  <List.Item<FunctionTrigger>
                    key={trigger.id}
                    item={trigger}
                    classNames={mx(grid, ghostHover, 'items-center', 'px-2')}
                  >
                    <Input.Root>
                      <Input.Switch
                        checked={trigger.enabled}
                        onCheckedChange={(checked) => (trigger.enabled = checked)}
                      />
                    </Input.Root>

                    <div className={'flex'}>
                      <List.ItemTitle
                        classNames='px-1 cursor-pointer w-0 shrink truncate'
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

const getCopyAction = (client: Client, trigger: FunctionTrigger | undefined) => {
  if (trigger?.spec?.kind === 'email') {
    return { translationKey: 'trigger copy email', contentProvider: () => `${getSpace(trigger)!.id}@dxos.network` };
  }

  if (trigger?.spec?.kind === 'webhook') {
    return { translationKey: 'trigger copy url', contentProvider: () => getWebhookUrl(client, trigger) };
  }

  return undefined;
};

const getWebhookUrl = (client: Client, trigger: FunctionTrigger) => {
  const spaceId = getSpace(trigger)!.id;
  const edgeUrl = new URL(client.config.values.runtime!.services!.edge!.url!);
  const isSecure = edgeUrl.protocol.startsWith('https') || edgeUrl.protocol.startsWith('wss');
  edgeUrl.protocol = isSecure ? 'https' : 'http';
  return new URL(`/webhook/${spaceId}:${trigger.id}`, edgeUrl).toString();
};

const getFunctionName = (functions: FunctionType[], trigger: FunctionTrigger) => {
  // TODO(wittjosiah): Truncation should be done in the UI.
  //   Warning that the List component is currently a can of worms.
  const shortId = trigger.function && `${trigger.function.dxn.toString().slice(0, 16)}…`;
  const functionObject = functions.find((fn) => fn === trigger.function?.target);
  return functionObject?.name ?? shortId;
};

const scriptMatch = (script: ScriptType) => (trigger: FunctionTrigger) => {
  const fn = trigger.function?.target;
  if (!Obj.instanceOf(FunctionType, fn)) {
    return false;
  }

  return fn.source?.target === script;
};

const projectMatch = (project: DataType.Project) => {
  const viewQueries = Function.pipe(
    project.collections,
    Array.map((collection) => collection.target),
    Array.filter(Schema.is(DataType.View)),
    Array.map((view) => Obj.getSnapshot(view).query.ast),
    Array.map((ast) => JSON.stringify(ast)),
  );

  return (trigger: FunctionTrigger) => {
    const spec = Obj.getSnapshot(trigger).spec;
    if (spec?.kind !== 'subscription') {
      return false;
    }

    // TODO(wittjosiah): Implement better way of comparing query ASTs.
    return viewQueries.some((query) => JSON.stringify(spec.query) === query);
  };
};

const triggerMatch = Match.type<Obj.Any>().pipe(
  Match.withReturnType<(trigger: FunctionTrigger) => boolean>(),
  Match.when(
    (obj) => Obj.instanceOf(ScriptType, obj),
    (obj) => scriptMatch(obj),
  ),
  Match.when(
    (obj) => Obj.instanceOf(DataType.Project, obj),
    (obj) => projectMatch(obj),
  ),
  Match.orElse((_obj) => () => true),
);
