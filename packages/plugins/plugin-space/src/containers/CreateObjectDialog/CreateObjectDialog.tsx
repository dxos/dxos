//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Capability } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { getPersonalSpace, LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';
import { useLayout } from '@dxos/app-toolkit/ui';
import { Operation } from '@dxos/compute';
import { Annotation, Collection, Database, Obj, Type } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Dialog, IconButton, useTranslation } from '@dxos/react-ui';
import { ViewAnnotation } from '@dxos/schema';

import { type CreateObjectOption, CreateObjectPanel, type CreateObjectPanelProps } from '#components';
import { meta } from '#meta';
import { SpaceCapabilities } from '#types';

export const CREATE_OBJECT_DIALOG = `${meta.id}.CreateObjectDialog`;

export type CreateObjectDialogProps = Pick<CreateObjectPanelProps, 'target' | 'typename' | 'initialFormValues'> & {
  views?: boolean;
  onCreateObject?: (object: Obj.Unknown) => void;
  shouldNavigate?: (object: Obj.Unknown) => boolean;
  targetNodeId?: string;
};

export const CreateObjectDialog = ({
  target: initialTarget,
  typename: initialTypename,
  views,
  initialFormValues,
  onCreateObject,
  shouldNavigate: _shouldNavigate,
  targetNodeId,
}: CreateObjectDialogProps) => {
  const { t } = useTranslation(meta.id);
  const manager = usePluginManager();
  const operationInvoker = useOperationInvoker();
  const [target, setTarget] = useState<Database.Database | Collection.Collection | undefined>(initialTarget);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const client = useClient();
  const spaces = useSpaces();
  const layout = useLayout();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
  // TODO(wittjosiah): Support database schemas.
  const schemas = db
    ? db.graph.registry
        .list()
        .filter(Type.isType)
        .filter((t) => !Type.isTypeKindSchema(t))
    : undefined;

  const entriesByModule = useAtomValue(manager.capabilities.atomByModule(SpaceCapabilities.CreateObjectEntry));

  const { createObjectEntries, pluginNameByEntryId } = useMemo(() => {
    const entries: SpaceCapabilities.CreateObjectEntry[] = [];
    const pluginByEntryId = new Map<string, string>();
    const plugins = manager.getPlugins();
    for (const [moduleId, contributions] of Object.entries(entriesByModule)) {
      const owningPlugin = plugins.find((plugin) => plugin.modules.some((module) => module.id === moduleId));
      for (const entry of contributions) {
        entries.push(entry);
        if (owningPlugin) {
          pluginByEntryId.set(entry.id, owningPlugin.meta.name);
        }
      }
    }
    return { createObjectEntries: entries, pluginNameByEntryId: pluginByEntryId };
  }, [entriesByModule, manager]);

  const resolve = useCallback<NonNullable<CreateObjectPanelProps['resolve']>>(
    (id) => createObjectEntries.find((entry) => entry.id === id),
    [createObjectEntries],
  );

  const viewTypenames = useMemo(() => {
    const set = new Set<string>();
    for (const schema of schemas ?? []) {
      if (ViewAnnotation.has(schema)) {
        set.add(Type.getTypename(schema));
      }
    }
    return set;
  }, [schemas]);

  const options = useMemo<CreateObjectOption[]>(
    () =>
      createObjectEntries
        .filter((entry) => (views === true ? viewTypenames.has(entry.id) : true))
        .map((entry) => {
          const type = schemas?.find((s) => Type.getTypename(s) === entry.id);
          const schema = type && Type.getSchema(type);
          const iconAnnotation = schema ? Annotation.IconAnnotation.get(schema).pipe(Option.getOrUndefined) : undefined;
          return {
            id: entry.id,
            label: t('typename.label', { ns: entry.id, defaultValue: entry.id }),
            icon: iconAnnotation?.icon,
            iconHue: iconAnnotation?.hue,
            plugin: pluginNameByEntryId.get(entry.id),
          };
        }),
    [createObjectEntries, views, viewTypenames, schemas, t, pluginNameByEntryId],
  );

  const handleCreateObject = useCallback<NonNullable<CreateObjectPanelProps['onCreateObject']>>(
    ({ metadata, data = {} }) =>
      Effect.gen(function* () {
        if (!target) {
          // TODO(wittjosiah): UI feedback.
          return;
        }

        // NOTE: Must close before navigating or attention won't follow object.
        closeRef.current?.click();

        const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
        invariant(db, 'Missing database');
        const result = yield* metadata.createObject(data, {
          db,
          target,
          targetNodeId,
        });
        const shouldNavigate = _shouldNavigate ?? (() => true);
        if (result.subject.length > 0 && shouldNavigate(result.object)) {
          if (layout.mode === 'multi') {
            yield* operationInvoker.invoke(LayoutOperation.Set, {
              subject: [...result.subject],
            });
            yield* operationInvoker.invoke(LayoutOperation.Expose, {
              subject: result.subject[0],
            });
          } else {
            yield* operationInvoker.invoke(LayoutOperation.Open, {
              subject: [...result.subject],
              navigation: 'immediate',
            });
          }
        }

        onCreateObject?.(result.object);
      }).pipe(
        Effect.provideService(Capability.Service, manager.capabilities),
        Effect.provideService(Operation.Service, operationInvoker),
        runAndForwardErrors,
      ),
    [target, _shouldNavigate, onCreateObject, manager.capabilities, operationInvoker, layout.mode],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>
          {t('create-object-dialog.title', {
            object: t('typename.label', { ns: typename, defaultValue: views ? 'View' : 'Object' }),
          })}
        </Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.ActionIconButton action='close' ref={closeRef} />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
        <CreateObjectPanel
          options={options}
          spaces={spaces}
          target={target}
          typename={typename}
          initialFormValues={initialFormValues}
          defaultSpaceId={getPersonalSpace(client)?.id ?? client.spaces.get()[0]?.id}
          resolve={resolve}
          onCreateObject={handleCreateObject}
          onTargetChange={setTarget}
          onTypenameChange={setTypename}
        />
      </Dialog.Body>
      <Dialog.ActionBar>
        <Dialog.Close asChild>
          <IconButton
            icon='ph--squares-four--regular'
            label={t('open-plugin-registry.label')}
            onClick={() => void operationInvoker.invokePromise(SettingsOperation.OpenPluginRegistry)}
          />
        </Dialog.Close>
      </Dialog.ActionBar>
    </Dialog.Content>
  );
};
