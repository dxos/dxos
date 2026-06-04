//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as EFn from 'effect/Function';
import * as Match from 'effect/Match';
import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useState } from 'react';

import { useProcessManagerRuntime } from '@dxos/app-framework/ui';
import { useTypeOptions } from '@dxos/app-toolkit/ui';
import { type ComputeEnvironment } from '@dxos/client-protocol';
import { Operation, Script, ServiceResolver, Trigger, TriggerEvent } from '@dxos/compute';
import { Context } from '@dxos/context';
import { Filter, Obj, Query, Tag, Type } from '@dxos/echo';
import { KEY_FEED_CURSOR, TriggerDispatcher } from '@dxos/functions-runtime';
import { FunctionsServiceClient } from '@dxos/functions-runtime/edge';
import { log } from '@dxos/log';
import { type Client, useClient } from '@dxos/react-client';
import { type Space, useObject, useQuery } from '@dxos/react-client/echo';
import { Clipboard, IconButton, type IconButtonProps, Input, Separator, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { Pipeline } from '@dxos/types';
import { ghostHover, mx } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';

import { type EdgeTriggersDispatcherStatusState, useEdgeTriggersDispatcherStatus } from '../../hooks';
import { TriggerEditor, type TriggerEditorProps } from '../TriggerEditor';
import { TriggerDispatcherSummary, TriggerEdgeMetadata } from './TriggerEdgeMetadata';

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
  const processManagerRuntime = useProcessManagerRuntime();
  const [properties] = useObject(space.properties);
  const computeEnvironment = properties.computeEnvironment ?? 'local';
  const edgeDispatcherStatus = useEdgeTriggersDispatcherStatus(space.id, computeEnvironment === 'edge');
  const functionsServiceClient = useMemo(() => FunctionsServiceClient.fromClient(client), [client]);
  const functions = useQuery(space.db, Filter.type(Operation.PersistentOperation));
  const triggers = useQuery(
    space.db,
    Query.select(Filter.type(Trigger.Trigger)).debugLabel('plugin-automation.AutomationPanel'),
  );
  const filteredTriggers = useMemo(() => {
    return object ? triggers.filter(triggerMatch(object)) : triggers;
  }, [object, triggers]);
  const tags = useQuery(space.db, Filter.type(Tag.Tag));
  const types = useTypeOptions({
    db: space.db,
    annotation: {
      location: ['database', 'runtime'],
      kind: ['user'],
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
      Obj.update(selected, (selected) => {
        Object.assign(selected, trigger);
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
    if (computeEnvironment === 'disabled') {
      return;
    }

    if (computeEnvironment === 'local') {
      try {
        await processManagerRuntime.runPromise(
          Effect.gen(function* () {
            const dispatcher = yield* TriggerDispatcher;
            yield* dispatcher.invokeTrigger({
              trigger,
              event: { tick: Date.now() } satisfies TriggerEvent.TimerEvent,
            });
          }).pipe(Effect.provide(ServiceResolver.provide({ space: space.id }, TriggerDispatcher))),
        );
      } catch (error) {
        log.catch(error);
      }
      return;
    }

    try {
      await functionsServiceClient.forceRunCronTrigger(Context.default(), space.id, trigger.id);
    } catch (error) {
      log.catch(error);
    }
  };

  const handleResetCursor = async (trigger: Trigger.Trigger) => {
    Obj.update(trigger, (trigger) => {
      Obj.deleteKeys(trigger, KEY_FEED_CURSOR);
    });
    await space.db.flush({ indexes: true });
  };

  if (trigger) {
    return (
      <Settings.Item title={t('trigger-editor.title')} description={t('trigger-editor.description')}>
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
    <Settings.Panel>
      <Clipboard.Provider>
        {computeEnvironment === 'edge' && (
          <TriggerDispatcherSummary
            status={edgeDispatcherStatus.status}
            error={edgeDispatcherStatus.error}
            loading={edgeDispatcherStatus.loading}
            timerTriggers={filteredTriggers.filter((trigger) => trigger.spec?.kind === 'timer')}
          />
        )}

        {filteredTriggers.length > 0 && (
          <List.Root<Trigger.Trigger>
            items={filteredTriggers}
            isItem={Schema.is(Type.getSchema(Trigger.Trigger))}
            getId={(field) => field.id}
          >
            {({ items: filteredTriggers }) => (
              <div role='list' className='flex flex-col w-full'>
                {filteredTriggers?.map((trigger) => (
                  <TriggerListItem
                    key={trigger.id}
                    trigger={trigger}
                    functions={functions}
                    computeEnvironment={computeEnvironment}
                    edgeDispatcherStatus={edgeDispatcherStatus}
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
        <IconButton icon='ph--plus--regular' label={t('new-trigger.label')} onClick={handleAdd} />
      </Clipboard.Provider>
    </Settings.Panel>
  );
};

const TriggerListItem = ({
  trigger,
  functions,
  computeEnvironment,
  edgeDispatcherStatus,
  onSelect,
  onDelete,
  onResetCursor,
  onForceRun,
}: {
  trigger: Trigger.Trigger;
  functions: Operation.PersistentOperation[];
  computeEnvironment: ComputeEnvironment;
  edgeDispatcherStatus?: EdgeTriggersDispatcherStatusState;
  onSelect?: (trigger: Trigger.Trigger) => void;
  onDelete?: (trigger: Trigger.Trigger) => void;
  onResetCursor?: (trigger: Trigger.Trigger) => void;
  onForceRun?: (trigger: Trigger.Trigger) => void;
}) => {
  const client = useClient();
  const copyAction = getCopyAction(client, trigger);
  const { t } = useTranslation(meta.id);
  const cursor = Obj.getKeys(trigger, KEY_FEED_CURSOR).at(0)?.id;
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
        disabled: !enabled || computeEnvironment === 'disabled',
        icon: 'ph--play--regular',
        label: 'Force run',
        onClick: handleForceRun,
      };
    }

    if (trigger.spec?.kind === 'feed' && onResetCursor) {
      return {
        disabled: !cursor,
        icon: 'ph--arrow-clockwise--regular',
        label: 'Reset cursor',
        onClick: handleResetCursor,
      };
    }
  }, [computeEnvironment, enabled, trigger.spec?.kind, handleForceRun, onResetCursor]);

  return (
    <List.Item<Obj.Snapshot<Trigger.Trigger>>
      key={trigger.id}
      item={snapshot}
      classNames={mx(grid, ghostHover, 'items-center', 'px-2')}
    >
      <Input.Root>
        <Input.Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </Input.Root>

      <div className='flex flex-col min-w-0'>
        <div className='flex'>
          <List.ItemTitle classNames='px-1 cursor-pointer w-0 shrink truncate' onClick={handleSelect}>
            {getFunctionName(functions, trigger) ?? '∅'}
          </List.ItemTitle>

          {copyAction && (
            <Clipboard.IconButton label={t(copyAction.translationKey)} value={copyAction.contentProvider()} />
          )}
        </div>

        {cursor && <div className='text-xs text-description truncate ml-4'>Position: {cursor}</div>}
        {computeEnvironment === 'edge' && edgeDispatcherStatus && (
          <TriggerEdgeMetadata trigger={trigger} edgeStatus={edgeDispatcherStatus} />
        )}
      </div>

      {actionProps ? <List.ItemIconButton {...actionProps} autoHide={false} /> : <div />}

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

const getFunctionName = (functions: Operation.PersistentOperation[], trigger: Trigger.Trigger) => {
  // TODO(wittjosiah): Truncation should be done in the UI.
  //   Warning that the List component is currently a can of worms.
  const shortId = trigger.function && `${trigger.function.uri.slice(0, 16)}…`;
  const functionObject = functions.find((fn) => fn === trigger.function?.target);
  return functionObject?.name ?? shortId;
};

const scriptMatch = (script: Script.Script) => (trigger: Trigger.Trigger) => {
  const fn = trigger.function?.target;
  if (!Obj.instanceOf(Operation.PersistentOperation, fn)) {
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
