//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Capability } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { allTypesQuery, getPersonalSpace, LayoutOperation } from '@dxos/app-toolkit';
import { PluginRegistryButton, useLayout } from '@dxos/app-toolkit/ui';
import { Operation } from '@dxos/compute';
import { Annotation, Collection, Database, Obj, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { ViewAnnotation } from '@dxos/schema';

import { makeCreateObjectEntryForDatabaseType } from '#capabilities';
import { type CreateObjectOption, CreateObjectPanel, type CreateObjectPanelProps } from '#components';
import { meta } from '#meta';
import { SpaceCapabilities } from '#types';

import { getSpaceDisplayName } from '../../util';

export const CREATE_OBJECT_DIALOG = `${meta.profile.key}.CreateObjectDialog`;

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
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();
  const operationInvoker = useOperationInvoker();
  const { invoke } = operationInvoker;
  const [target, setTarget] = useState<Database.Database | Collection.Collection | undefined>(initialTarget);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const client = useClient();
  const spaces = useSpaces();
  const layout = useLayout();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
  const allTypes = useQuery(db, allTypesQuery);
  const space = useMemo(() => spaces.find((s) => s.db === db), [spaces, db]);
  const spaceLabel = useMemo(
    () =>
      space &&
      toLocalizedString(getSpaceDisplayName(space, { personal: space.id === getPersonalSpace(client)?.id }), t),
    [space, client, t],
  );

  // Index all types by typename for label/icon lookups.
  const typeByTypename = useMemo(() => {
    const map = new Map<string, Type.AnyEntity>();
    for (const type of allTypes) {
      map.set(Type.getTypename(type), type);
    }
    return map;
  }, [allTypes]);

  const entriesByModule = useAtomValue(manager.capabilities.atomByModule(SpaceCapabilities.CreateObjectEntry));

  const { capabilityEntries, pluginNameByEntryId } = useMemo(() => {
    const entries: SpaceCapabilities.CreateObjectEntry[] = [];
    const pluginByEntryId = new Map<string, string>();
    const plugins = manager.getPlugins();
    for (const [moduleId, contributions] of Object.entries(entriesByModule)) {
      const owningPlugin = plugins.find((plugin) => plugin.modules.some((module) => module.id === moduleId));
      for (const entry of contributions) {
        entries.push(entry);
        if (owningPlugin) {
          pluginByEntryId.set(entry.id, owningPlugin.meta.profile.name);
        }
      }
    }
    return { capabilityEntries: entries, pluginNameByEntryId: pluginByEntryId };
  }, [entriesByModule, manager]);

  // Synthesize entries for database-persisted object schemas that have no registered capability.
  const createObjectEntries = useMemo(() => {
    const registeredIds = new Set(capabilityEntries.map((e) => e.id));
    // allTypesQuery returns meta-schema entities which may be any entity kind at runtime,
    // but the query's TypeScript type is conservatively AnyType[]; widen to enable kind narrowing below.
    const dbEntries = (allTypes as Type.AnyEntity[])
      .filter((type): type is Type.AnyObj => Type.isObject(type) && Type.getDatabase(type) != null)
      .filter((type) => !registeredIds.has(Type.getTypename(type)))
      .map((type) => makeCreateObjectEntryForDatabaseType(type));
    return [...capabilityEntries, ...dbEntries];
  }, [capabilityEntries, allTypes]);

  const resolve = useCallback<NonNullable<CreateObjectPanelProps['resolve']>>(
    (id) => createObjectEntries.find((entry) => entry.id === id),
    [createObjectEntries],
  );

  // The type selector is shown while no type has been resolved; the registry button is only relevant then.
  const showTypeSelector = !(typename && resolve(typename));

  const viewTypenames = useMemo(() => {
    const set = new Set<string>();
    for (const [name, type] of typeByTypename) {
      if (ViewAnnotation.has(type)) {
        set.add(name);
      }
    }
    return set;
  }, [typeByTypename]);

  const options = useMemo<CreateObjectOption[]>(
    () =>
      createObjectEntries
        .filter((entry) => (views === true ? viewTypenames.has(entry.id) : true))
        .map((entry) => {
          const type = typeByTypename.get(entry.id);
          const schema = type && Type.getSchema(type);
          const iconAnnotation = schema ? Annotation.IconAnnotation.get(schema).pipe(Option.getOrUndefined) : undefined;
          const isDatabase = type ? Type.getDatabase(type) != null : false;
          return {
            id: entry.id,
            label:
              (isDatabase && type ? Type.getLabel(type) : undefined) ??
              t('typename.label', { ns: entry.id, defaultValue: entry.id }),
            icon: iconAnnotation?.icon,
            iconHue: iconAnnotation?.hue,
            plugin: pluginNameByEntryId.get(entry.id),
            description: isDatabase ? spaceLabel : undefined,
          };
        }),
    [createObjectEntries, views, viewTypenames, typeByTypename, t, pluginNameByEntryId, spaceLabel],
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
        const result = yield* metadata.createObject(data, { db, target, targetNodeId });
        const shouldNavigate = _shouldNavigate ?? (() => true);
        if (result.subject.length > 0 && shouldNavigate(result.object)) {
          if (layout.mode === 'multi') {
            yield* invoke(LayoutOperation.Set, {
              subject: [...result.subject],
            });
            yield* invoke(LayoutOperation.Expose, {
              subject: result.subject[0],
            });
          } else {
            yield* invoke(LayoutOperation.Open, {
              subject: [...result.subject],
              navigation: 'immediate',
            });
          }
        }

        onCreateObject?.(result.object);
      }).pipe(
        Effect.provideService(Capability.Service, manager.capabilities),
        Effect.provideService(Operation.Service, operationInvoker),
        EffectEx.runAndForwardErrors,
      ),
    [target, _shouldNavigate, onCreateObject, manager.capabilities, invoke, layout.mode],
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
      {showTypeSelector && (
        <Dialog.ActionBar>
          <Dialog.Close asChild>
            <PluginRegistryButton />
          </Dialog.Close>
        </Dialog.ActionBar>
      )}
    </Dialog.Content>
  );
};
