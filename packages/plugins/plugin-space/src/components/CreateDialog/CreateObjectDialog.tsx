//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Capabilities, LayoutAction, chain, createIntent } from '@dxos/app-framework';
import { useIntentDispatcher, usePluginManager } from '@dxos/app-framework/react';
import { Database, Obj, Type } from '@dxos/echo';
import { EntityKind, getTypeAnnotation } from '@dxos/echo/internal';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { isLiveObject, useSpaces } from '@dxos/react-client/echo';
import { Dialog, IconButton, useTranslation } from '@dxos/react-ui';
import { cardDialogContent, cardDialogHeader } from '@dxos/react-ui-stack';
import { type Collection } from '@dxos/schema';

import { meta } from '../../meta';
import { SpaceAction } from '../../types';

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
  const { dispatch } = useIntentDispatcher();
  const [target, setTarget] = useState<Database.Database | Collection.Collection | undefined>(initialTarget);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const client = useClient();
  const spaces = useSpaces();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const resolve = useCallback<NonNullable<CreateObjectPanelProps['resolve']>>(
    (typename) => {
      const metadata = manager.context
        .getCapabilities(Capabilities.Metadata)
        .find(({ id }) => id === typename)?.metadata;
      return metadata?.createObjectIntent ? (metadata as Metadata) : undefined;
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
        const { object } = yield* dispatch(metadata.createObjectIntent(data, { db }));
        if (isLiveObject(object) && !Obj.instanceOf(Type.PersistentType, object)) {
          // TODO(wittjosiah): Selection in navtree isn't working as expected when hidden typenames evals to true.
          const hidden = !metadata.addToCollectionOnCreate;
          const addObjectIntent = createIntent(SpaceAction.AddObject, {
            target,
            object,
            hidden,
          });
          const shouldNavigate = _shouldNavigate ?? (() => true);
          if (shouldNavigate(object)) {
            yield* dispatch(Function.pipe(addObjectIntent, chain(LayoutAction.Open, { part: 'main' })));
          } else {
            yield* dispatch(addObjectIntent);
          }

          onCreateObject?.(object);
        }
      }).pipe(runAndForwardErrors),
    [dispatch, target, resolve, _shouldNavigate],
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
