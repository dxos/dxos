//
// Copyright 2024 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { useActivationSignal, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { PluginRegistryButton, usePluginRegistryAvailable } from '@dxos/app-toolkit/ui';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Collection, Database, Obj, Type } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { useSpaces } from '@dxos/react-client/echo';
import { Button, Dialog, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { CollectionItemAnnotation, FactoryAnnotation, ViewAnnotation } from '@dxos/schema';

import { makeCreateObjectEntryForDatabaseType } from '#capabilities';
import { type CreateObjectOption, CreateObjectPanel, type CreateObjectPanelProps } from '#components';
import { meta } from '#meta';
import { SpaceCapabilities, SpaceEvents, SpaceOperation } from '#types';

import { type ObjectFormHandle, getSpaceDisplayName } from '../../util/index.ts';

export type ObjectFormDialogProps = Pick<CreateObjectPanelProps, 'target' | 'typename' | 'mode' | 'schema'> & {
  views?: boolean;
  /** Initial values, seeded into the form (`draft`) or into the object at creation (`live`). */
  defaults?: Record<string, any>;
  /** Settled once, with the confirmed object or with nothing; see {@link ObjectFormHandle}. */
  handle?: ObjectFormHandle;
  shouldNavigate?: (object: Obj.Unknown) => boolean;
  targetNodeId?: string;
};

/**
 * The one create-an-object surface: a target picker, a type picker, and a form over the chosen type.
 *
 * In `live` mode the object is added to the database before the form opens, so fields that resolve
 * against the database — dynamic option lookups, autofill, inline refs, child objects — behave
 * exactly as they do after creation. Dismissing the dialog by any route other than the confirm
 * button removes it again, so a cancelled create leaves nothing behind; the cleanup hangs off
 * unmount rather than off the cancel button because escape, the overlay, and the close affordance
 * never reach a handler and each of them is a cancel.
 */
export const ObjectFormDialog = ({
  target: initialTarget,
  typename: initialTypename,
  mode = 'draft',
  schema,
  views,
  defaults,
  handle,
  shouldNavigate: _shouldNavigate,
  targetNodeId,
}: ObjectFormDialogProps) => {
  const { t } = useTranslation(meta.profile.key);
  const manager = usePluginManager();
  // Demand signal: load policy-parked CreateObjectEntry providers; the picker below reads them
  // reactively, so entries pop in as their chunks arrive.
  useActivationSignal(SpaceEvents.CreateObjectRequested);
  const operationInvoker = useOperationInvoker();
  const { invoke } = operationInvoker;
  const [target, setTarget] = useState<Database.Database | Collection.Collection | undefined>(initialTarget);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  // Spaces the app manages on the user's behalf are never targets for new objects.
  const spaces = useSpaces().filter((space) => AppSpace.isVisibleSpace(space));
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
  const allTypes = useQuery(db, TypeOptions.allTypesQuery);
  const space = useMemo(() => spaces.find((s) => s.db === db), [spaces, db]);
  const spaceLabel = useMemo(() => space && toLocalizedString(getSpaceDisplayName(space), t), [space, t]);

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

  // Matches the panel's own gate: the selector shows while no type has been *chosen*, not while its
  // entry is still resolving — otherwise the registry button blinks in for the same frame.
  const showTypeSelector = !typename;
  // Gated here as well as in the button: `Dialog.Close asChild` needs an element child, so the
  // action bar cannot wrap a button that renders nothing.
  const registryAvailable = usePluginRegistryAvailable();

  const viewTypenames = useMemo(() => {
    const set = new Set<string>();
    for (const [name, type] of typeByTypename) {
      if (ViewAnnotation.has(type)) {
        set.add(name);
      }
    }
    return set;
  }, [typeByTypename]);

  // Types eligible to live inside a collection: collections themselves, plus types carrying
  // CollectionItemAnnotation. Used to filter the create dialog when targeting a collection.
  const collectionItemTypenames = useMemo(() => {
    const set = new Set<string>();
    const collectionTypename = Type.getTypename(Collection.Collection);
    for (const [name, type] of typeByTypename) {
      if (
        name === collectionTypename ||
        CollectionItemAnnotation.get(Type.getSchema(type)).pipe(Option.getOrElse(() => false))
      ) {
        set.add(name);
      }
    }
    return set;
  }, [typeByTypename]);

  // When creating into a collection, offer only collection-eligible types (mirrors the `views` filter).
  const collectionTarget = Collection.isCollection(target);

  const options = useMemo<CreateObjectOption[]>(
    () =>
      createObjectEntries
        .filter((entry) =>
          views === true
            ? viewTypenames.has(entry.id)
            : collectionTarget
              ? collectionItemTypenames.has(entry.id)
              : true,
        )
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
    [
      createObjectEntries,
      views,
      viewTypenames,
      collectionTarget,
      collectionItemTypenames,
      typeByTypename,
      t,
      pluginNameByEntryId,
      spaceLabel,
    ],
  );

  const navigateTo = useCallback(
    (object: Obj.Unknown) =>
      Effect.gen(function* () {
        const shouldNavigate = _shouldNavigate ?? (() => true);
        if (!shouldNavigate(object)) {
          return;
        }

        // Where an object lands in the tree is the resolver's question, not the create's.
        const { targets } = yield* invoke(NavigationOperation.ResolveNavigationTargets, {
          query: { uri: Obj.getURI(object) },
        });
        const navigationTarget = targets[0];
        if (navigationTarget) {
          yield* invoke(LayoutOperation.Open, { subject: [navigationTarget.path], navigation: 'immediate' });
          yield* invoke(LayoutOperation.Expose, { subject: navigationTarget.path });
        }
      }),
    [_shouldNavigate, invoke],
  );

  //
  // Live mode.
  //

  const type = typename ? typeByTypename.get(typename) : undefined;
  const [object, setObject] = useState<Obj.Unknown | undefined>();
  // Read inside the create effect so a caller passing an inline object literal does not re-run it.
  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;
  // Set by the confirm button, which is the one dismissal route that keeps what the form built.
  const confirmed = useRef(false);

  // Escape, the overlay, and the close affordance dismiss the dialog without reaching a handler, and
  // each of them is a cancel — so the dismissal hangs off unmount. `dismiss` is applied a task later,
  // which is what keeps StrictMode's development unmount/remount from reading as one.
  useEffect(() => {
    handle?.retain();
    return () => handle?.dismiss();
  }, [handle]);

  useEffect(() => {
    if (mode !== 'live' || !db || !type || !Type.isObject(type)) {
      return;
    }

    // Types whose required structure `Obj.make` cannot produce alone (a required ref to a backing
    // object, say) declare a factory to take over construction.
    const factory = Option.getOrUndefined(FactoryAnnotation.get(Type.getSchema(type)));
    const values = defaultsRef.current ?? {};
    const made = factory ? factory(values) : Obj.make(type, values);
    invariant(Obj.isObject(made), 'Factory did not return an object.');
    const created = db.add(made);
    setObject(created);

    return () => {
      setObject(undefined);
      if (!confirmed.current) {
        Obj.getDatabase(created)?.remove(created);
      }
    };
  }, [mode, db, type]);

  const handleConfirm = useCallback(() => {
    if (!object || !target) {
      return;
    }

    // Settled before the close below, since closing unmounts the dialog and an unmount is otherwise
    // read as a cancel — and cancelling would take the object back out.
    confirmed.current = true;
    handle?.settle(object);

    // NOTE: Must close before navigating or attention won't follow object.
    closeRef.current?.click();
    void Effect.gen(function* () {
      // The object is already persisted; this files it under the target collection, if there is one.
      yield* Operation.invoke(
        SpaceOperation.AddObject,
        { object, target: Collection.isCollection(target) ? target : undefined },
        { spaceId: db?.spaceId },
      );
      yield* navigateTo(object);
    }).pipe(
      Effect.provideService(Capability.Service, manager.capabilities),
      Effect.provideService(Operation.Service, operationInvoker),
      EffectEx.runAndForwardErrors,
    );
  }, [object, target, db, navigateTo, handle, manager.capabilities, operationInvoker]);

  //
  // Draft mode.
  //

  const handleCreateObject = useCallback<NonNullable<CreateObjectPanelProps['onCreateObject']>>(
    ({ metadata, data = {} }) =>
      Effect.gen(function* () {
        if (!target) {
          // TODO(wittjosiah): UI feedback.
          return;
        }

        // A draft is built after the dialog has closed, so the unmount below lands before the object
        // exists; without this the handle would settle as a cancel while the create was still running.
        confirmed.current = true;
        handle?.confirm();

        // NOTE: Must close before navigating or attention won't follow object.
        closeRef.current?.click();

        const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
        invariant(db, 'Missing database');
        // The dialog targets a database to mean "the space root"; downstream that is the absence of
        // a collection, since `db` already says which space.
        const collection = Collection.isCollection(target) ? target : undefined;
        const result = yield* metadata.createObject(data, { db, target: collection, targetNodeId });
        // Settled before navigating, as in the live path: the object is created and persisted by
        // this point, so a navigation failure must not report it to the caller as a dismissal.
        handle?.settle(result.object);
        // A create may legitimately finish without an object: the connector entry hands off to an
        // OAuth popup or credential dialog and the Connection appears later, out of band.
        if (result.object) {
          yield* navigateTo(result.object);
        }
      }).pipe(
        // A failed create still has to settle, or the operation waiting on the dialog never returns.
        Effect.ensuring(Effect.sync(() => handle?.settle())),
        Effect.provideService(Capability.Service, manager.capabilities),
        Effect.provideService(Operation.Service, operationInvoker),
        EffectEx.runAndForwardErrors,
      ),
    [target, targetNodeId, navigateTo, handle, manager.capabilities, operationInvoker],
  );

  return (
    // A click outside must not dismiss: this dialog holds unsaved form input, and a stray click on
    // the overlay would discard it with no undo. Escape and the close button remain.
    <Dialog.Content onInteractOutside={(event) => event.preventDefault()}>
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
          mode={mode}
          schema={schema}
          object={object}
          type={type}
          initialFormValues={defaults}
          resolve={resolve}
          onCreateObject={handleCreateObject}
          onTargetChange={setTarget}
          onTypenameChange={setTypename}
        />
      </Dialog.Body>
      {object ? (
        <Dialog.ActionBar>
          <Dialog.Close asChild>
            <Button data-testid='object-form.cancel'>{t('object-form-cancel.label')}</Button>
          </Dialog.Close>
          <Button variant='primary' onClick={handleConfirm} data-testid='object-form.confirm'>
            {t('object-form-confirm.label')}
          </Button>
        </Dialog.ActionBar>
      ) : (
        showTypeSelector &&
        registryAvailable && (
          <Dialog.ActionBar>
            <Dialog.Close asChild>
              <PluginRegistryButton />
            </Dialog.Close>
          </Dialog.ActionBar>
        )
      )}
    </Dialog.Content>
  );
};

ObjectFormDialog.displayName = 'ObjectFormDialog';
