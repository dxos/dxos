//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Capability } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Database, Obj, Type } from '@dxos/echo';
import { EntityKind, getTypeAnnotation } from '@dxos/echo/internal';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { type Collection } from '@dxos/schema';

import {
  CreateObjectPanel,
  type CreateObjectPanelProps,
  type Metadata,
} from '../../components/CreateDialog/CreateObjectPanel';
import { meta } from '../../meta';
import { SpaceOperation } from '../../types';

export const CREATE_OBJECT_DIALOG = `${meta.id}/CreateObjectDialog`;

export type CreateObjectDialogProps = Pick<
  CreateObjectPanelProps,
  'target' | 'views' | 'typename' | 'initialFormValues'
> & {
  onCreateObject?: (object: Obj.Unknown) => void;
  shouldNavigate?: (object: Obj.Unknown) => boolean;
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
  const operationInvoker = useOperationInvoker();
  const [target, setTarget] = useState<Database.Database | Collection.Collection | undefined>(initialTarget);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const client = useClient();
  const spaces = useSpaces();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const resolve = useCallback<NonNullable<CreateObjectPanelProps['resolve']>>(
    (typename) => {
      const metadata = manager.capabilities
        .getAll(AppCapabilities.Metadata)
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
        const object = yield* metadata.createObject(data, { db });
        if (Obj.isObject(object) && !Obj.instanceOf(Type.PersistentType, object)) {
          // TODO(wittjosiah): Selection in navtree isn't working as expected when hidden typenames evals to true.
          const hidden = !metadata.addToCollectionOnCreate;
          yield* operationInvoker.invoke(SpaceOperation.AddObject, {
            target,
            object,
            hidden,
          });
          const shouldNavigate = _shouldNavigate ?? (() => true);
          if (shouldNavigate(object)) {
            yield* operationInvoker.invoke(LayoutOperation.Open, {
              subject: [Obj.getDXN(object).toString()],
            });
          }

          onCreateObject?.(object);
        }
      }).pipe(
        Effect.provideService(Capability.Service, manager.capabilities),
        Effect.provideService(Operation.Service, operationInvoker),
        runAndForwardErrors,
      ),
    [target, _shouldNavigate, onCreateObject, manager.capabilities, operationInvoker],
  );

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>
          {t('create object dialog title', {
            object: t('typename label', {
              ns: typename,
              defaultValue: views ? 'View' : 'Object',
            }),
          })}
        </Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton ref={closeRef} />
        </Dialog.Close>
      </Dialog.Header>
      <Dialog.Body>
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
      </Dialog.Body>
    </Dialog.Content>
  );
};
