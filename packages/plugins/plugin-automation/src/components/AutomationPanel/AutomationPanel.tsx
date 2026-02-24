//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as EFn from 'effect/Function';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { Filter, Obj, Tag } from '@dxos/echo';
import { Function, Script, Trigger } from '@dxos/functions';
import { KEY_QUEUE_CURSOR } from '@dxos/functions-runtime';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { useTypeOptions } from '@dxos/plugin-space';
import { type Client, useClient } from '@dxos/react-client';
import { type Space, useObject, useQuery } from '@dxos/react-client/echo';
import { Clipboard, IconButton, type IconButtonProps, Input, Separator, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { Pipeline } from '@dxos/types';
import { ghostHover, mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';
import { TriggerEditor, type TriggerEditorProps } from '../TriggerEditor';

const grid = 'grid grid-cols-[40px_1fr_32px_32px] min-h-[2.5rem]';

export type AutomationPanelProps = {
  space: Space;
  object?: Obj.Unknown;
  initialTrigger?: Trigger.Trigger;
  onDone?: () => void;
};

// TODO(burdon): Factor out common layout with ViewEditor.
export const AutomationPanel = ({ space, object, initialTrigger, onDone }: AutomationPanelProps) => {
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
      Obj.change(selected, (mutable) => {
        Object.assign(mutable, trigger);
      });
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

  const handleResetCursor = async (trigger: Trigger.Trigger) => {
    Obj.change(trigger, (t) => {
      Obj.deleteKeys(t, KEY_QUEUE_CURSOR);
    });
    await space.db.flush({ indexes: true });
  };

  if (trigger) {
    return (
      <Settings.Item title={t('trigger editor title')} description={t('trigger editor description')}>
        <TriggerEditor
          db={space.db}
          trigger={trigger}
          readonlySpec={Boolean(object)}
          tags={tags}
          types={types}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Settings.Item>
    );
  }

  return (
    <Settings.Container>
      {filteredTriggers.length > 0 && (
        <List.Root<Trigger.Trigger>
          items={filteredTriggers}
          isItem={Schema.is(Trigger.Trigger)}
          getId={(field) => field.id}
        >
          {({ items: filteredTriggers }) => (
            <div role='list' className='flex flex-col w-full'>
              {filteredTriggers?.map((trigger) => (
                <TriggerListItem
                  key={trigger.id}
                  trigger={trigger}
                  functions={functions}
                  onSelect={handleSelect}
                  onDelete={handleDelete}
                  onResetCursor={handleResetCursor}
                  onForceRun={handleForceRunTrigger}
                />
              ))}
            </div>
          )}
        </List.Root>
      )}

      {filteredTriggers.length > 0 && <Separator classNames='my-4' />}
      <IconButton icon='ph--plus--regular' label={t('new trigger label')} onClick={handleAdd} />
    </Settings.Container>
  );
};

const TriggerListItem = ({
  trigger,
  functions,
  onSelect,
  onDelete,
  onResetCursor,
  onForceRun,
}: {
  trigger: Trigger.Trigger;
  functions: Function.Function[];
  onSelect?: (trigger: Trigger.Trigger) => void;
  onDelete?: (trigger: Trigger.Trigger) => void;
  onResetCursor?: (trigger: Trigger.Trigger) => void;
  onForceRun?: (trigger: Trigger.Trigger) => void;
}) => {
  const client = useClient();
  const copyAction = getCopyAction(client, trigger);
  const { t } = useTranslation(meta.id);
  const cursor = Obj.getKeys(trigger, KEY_QUEUE_CURSOR).at(0)?.id;
  const [snapshot, updateTrigger] = useObject(trigger);

  const enabled = snapshot.enabled ?? false;
  const onEnabledChange = (checked: boolean) => {
    updateTrigger((trigger) => {
      trigger.enabled = checked;
    });
  };

  const handleSelect = useCallback(() => {
    onSelect?.(trigger);
  }, [onSelect, trigger]);

  const handleDelete = useCallback(() => {
    onDelete?.(trigger);
  }, [onDelete, trigger]);

  const handleResetCursor = useCallback(() => {
    onResetCursor?.(trigger);
  }, [onResetCursor, trigger]);

  const handleForceRun = useCallback(() => {
    onForceRun?.(trigger);
  }, [onForceRun, trigger]);

  const actionProps = useMemo<IconButtonProps | undefined>(() => {
    if (trigger.spec?.kind === 'timer' && onForceRun) {
      return {
        disabled: !enabled || trigger.spec?.kind !== 'timer',
        icon: 'ph--play--regular',
        label: 'Force run',
        onClick: handleForceRun,
      };
    }

    if (trigger.spec?.kind === 'queue' && onResetCursor) {
      return {
        disabled: !cursor,
        icon: 'ph--arrow-clockwise--regular',
        label: 'Reset cursor',
        onClick: handleResetCursor,
      };
    }
  }, [enabled, trigger.spec?.kind, handleForceRun]);

  return (
    <List.Item<Obj.Snapshot<Trigger.Trigger>>
      key={trigger.id}
      item={snapshot}
      classNames={mx(grid, ghostHover, 'items-center', 'px-2')}
    >
      <Input.Root>
        <Input.Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </Input.Root>

      <div className={'flex'}>
        <List.ItemTitle classNames='px-1 cursor-pointer w-0 shrink truncate' onClick={handleSelect}>
          {getFunctionName(functions, trigger) ?? '∅'}
          {cursor && <div className='text-xs text-description truncate ml-4'>Position: {cursor}</div>}
        </List.ItemTitle>

        {copyAction && (
          <Clipboard.IconButton label={t(copyAction.translationKey)} value={copyAction.contentProvider()} />
        )}
      </div>

      {actionProps ? <List.ItemButton {...actionProps} autoHide={false} /> : <div />}

      {onDelete && <List.ItemDeleteButton onClick={handleDelete} />}
    </List.Item>
  );
};

const getCopyAction = (client: Client, trigger: Trigger.Trigger | undefined) => {
  if (trigger?.spec?.kind === 'email') {
    return {
      translationKey: 'trigger copy email' as const,
      contentProvider: () => `${Obj.getDatabase(trigger)!.spaceId}@dxos.network`,
    };
  }

  if (trigger?.spec?.kind === 'webhook') {
    return {
      translationKey: 'trigger copy url' as const,
      contentProvider: () => getWebhookUrl(client, trigger!),
    };
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

const projectMatch = (project: Pipeline.Pipeline) => {
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

const triggerMatch = Match.type<Obj.Unknown>().pipe(
  Match.withReturnType<(trigger: Trigger.Trigger) => boolean>(),
  Match.when(
    (obj) => Obj.instanceOf(Script.Script, obj),
    (obj) => scriptMatch(obj),
  ),
  Match.when(
    (obj) => Obj.instanceOf(Pipeline.Pipeline, obj),
    (obj) => projectMatch(obj),
  ),
  Match.orElse((_obj) => () => true),
);
