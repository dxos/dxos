//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Capability } from '@dxos/app-framework';
import { useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppCapabilities, getPersonalSpace, LayoutOperation } from '@dxos/app-toolkit';
import { Collection, Database, Obj, Type } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Dialog, useTranslation } from '@dxos/react-ui';
import { ViewAnnotation } from '@dxos/schema';

import {
  type CreateObjectOption,
  CreateObjectPanel,
  type CreateObjectPanelProps,
  type Metadata,
} from '../../components';
import { meta } from '../../meta';

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
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const db = Database.isDatabase(target) ? target : target && Obj.getDatabase(target);
  // TODO(wittjosiah): Support database schemas.
  const schemas = db?.schemaRegistry.query({ location: ['runtime'], includeSystem: false }).runSync();

  const resolve = useCallback<NonNullable<CreateObjectPanelProps['resolve']>>(
    (id) => {
      const metadata = manager.capabilities
        .getAll(AppCapabilities.Metadata)
        .find(({ id: entryId }) => entryId === id)?.metadata;
      return metadata?.createObject ? (metadata as Metadata) : undefined;
    },
    [manager],
  );

  const viewTypenames = useMemo(() => {
    const set = new Set<string>();
    for (const schema of schemas ?? []) {
      if (ViewAnnotation.get(schema).pipe(Option.getOrElse(() => false))) {
        set.add(Type.getTypename(schema));
      }
    }
    return set;
  }, [schemas]);

  const options = useMemo<CreateObjectOption[]>(
    () =>
      manager.capabilities
        .getAll(AppCapabilities.Metadata)
        .filter((entry) => entry.metadata?.createObject)
        .filter((entry) => (views === true ? viewTypenames.has(entry.id) : true))
        .map((entry) => ({
          id: entry.id,
          label: t('typename.label', { ns: entry.id, defaultValue: entry.id }),
          icon: entry.metadata?.icon,
        })),
    [manager, views, viewTypenames, t],
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
          yield* operationInvoker.invoke(LayoutOperation.Open, {
            subject: [...result.subject],
            navigation: 'immediate',
          });
        }

        onCreateObject?.(result.object);
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
          {t('create-object-dialog.title', {
            object: t('typename.label', { ns: typename, defaultValue: views ? 'View' : 'Object' }),
          })}
        </Dialog.Title>
        <Dialog.Close asChild>
          <Dialog.CloseIconButton ref={closeRef} />
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
    </Dialog.Content>
  );
};
