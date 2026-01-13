//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/react';
import { Database, Obj, Type } from '@dxos/echo';
import { EntityKind, getTypeAnnotation } from '@dxos/echo/internal';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { isLiveObject, useSpaces } from '@dxos/react-client/echo';
import { Dialog, IconButton, useTranslation } from '@dxos/react-ui';
import { cardDialogContent, cardDialogHeader } from '@dxos/react-ui-mosaic';
import { type Collection } from '@dxos/schema';

import { meta } from '../../meta';
import { SpaceOperation } from '../../types';

import { CreateObjectPanel, type CreateObjectPanelProps, type Metadata } from './CreateObjectPanel';

export const CREATE_OBJECT_DIALOG = `${meta.id}/CreateObjectDialog`;

export type CreateObjectDialogProps = Pick<
  CreateObjectPanelProps,
  'target' | 'views' | 'typename' | 'initialFormValues'
> & {
  onCreateObject?: (object: Obj.Any) => void;
  shouldNavigate?: (object: Obj.Any) => boolean;
};

export const CreateObjectDialog = ({
  target: initialTarget,
  typename: initialTypename,
  views,
  initialFormValues,
  onCreateObject,
  shouldNavigate: _shouldNavigate,
}: CreateObjectDialogProps) => {
  const manager = usePluginManager();
  const { t } = useTranslation(meta.id);
  const { invoke, invokePromise } = useOperationInvoker();
  const [target, setTarget] = useState<Database.Database | Collection.Collection | undefined>(initialTarget);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const client = useClient();
  const spaces = useSpaces();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const resolve = useCallback<NonNullable<CreateObjectPanelProps['resolve']>>(
    (typename) => {
      const metadata = manager.context
        .getCapabilities(Common.Capability.Metadata)
        .find(({ id }) => id === typename)?.metadata;
      return metadata?.createObject ? (metadata as Metadata) : undefined;
    },
    [manager],
  );

  const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
  // TODO(wittjosiah): Support database schemas.
  const schemas = db?.schemaRegistry.query({ location: ['runtime'], includeSystem: false }).runSync();
  const userSchemas = useMemo(
    () =>
      schemas
        ?.filter((schema) => getTypeAnnotation(schema)?.kind !== EntityKind.Relation)
        .filter((schema) => !!resolve(Type.getTypename(schema))) ?? [],
    [schemas],
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
        const object = yield* metadata.createObject(data, { db, context: manager.context });
        if (isLiveObject(object) && !Obj.instanceOf(Type.PersistentType, object)) {
          // TODO(wittjosiah): Selection in navtree isn't working as expected when hidden typenames evals to true.
          const hidden = !metadata.addToCollectionOnCreate;
          yield* invoke(SpaceOperation.AddObject, {
            target,
            object,
            hidden,
          });
          const shouldNavigate = _shouldNavigate ?? (() => true);
          if (shouldNavigate(object)) {
            yield* Effect.promise(() =>
              invokePromise(Common.LayoutOperation.Open, { subject: [Obj.getDXN(object).toString()] }),
            );
          }

          onCreateObject?.(object);
        }
      }).pipe(runAndForwardErrors),
    [invoke, invokePromise, target, _shouldNavigate, manager.context, onCreateObject],
  );

  return (
    // TODO(wittjosiah): The tablist dialog pattern is copied from @dxos/plugin-manager.
    //  Consider factoring it out to the tabs package.
    <Dialog.Content classNames={cardDialogContent}>
      <div role='none' className={cardDialogHeader}>
        <Dialog.Title>
          {t('create object dialog title', {
            object: t('typename label', {
              ns: typename,
              defaultValue: views ? 'View' : 'Object',
            }),
          })}
        </Dialog.Title>
        <Dialog.Close asChild>
          <IconButton
            ref={closeRef}
            icon='ph--x--regular'
            size={4}
            label='Close'
            iconOnly
            density='fine'
            variant='ghost'
            autoFocus
          />
        </Dialog.Close>
      </div>

      <CreateObjectPanel
        schemas={userSchemas}
        spaces={spaces}
        target={target}
        views={views}
        typename={typename}
        initialFormValues={initialFormValues}
        defaultSpaceId={client.spaces.default.id}
        resolve={resolve}
        onTargetChange={setTarget}
        onTypenameChange={setTypename}
        onCreateObject={handleCreateObject}
      />
    </Dialog.Content>
  );
};
