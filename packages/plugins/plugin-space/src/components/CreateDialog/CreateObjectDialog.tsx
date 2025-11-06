//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import React, { useCallback, useRef, useState } from 'react';

import {
  Capabilities,
  LayoutAction,
  chain,
  createIntent,
  useCapabilities,
  useIntentDispatcher,
  usePluginManager,
} from '@dxos/app-framework';
import { Obj, Query, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { type Space, getSpace, isLiveObject, isSpace, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Dialog, IconButton, useTranslation } from '@dxos/react-ui';
import { cardDialogContent, cardDialogHeader } from '@dxos/react-ui-stack';
import { Collection, StoredSchema, getTypenameFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { SpaceCapabilities } from '../../capabilities';
import { meta } from '../../meta';
import { SpaceAction } from '../../types';

import { CreateObjectPanel, type CreateObjectPanelProps } from './CreateObjectPanel';

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
  const forms = useCapabilities(SpaceCapabilities.ObjectForm);
  const [target, setTarget] = useState<Space | Collection.Collection | undefined>(initialTarget);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const client = useClient();
  const spaces = useSpaces();
  const space = isSpace(target) ? target : getSpace(target);
  const queryCollections = useQuery(space, Query.type(Collection.QueryCollection));
  const hiddenTypenames = queryCollections
    .map((collection) => getTypenameFromQuery(collection.query))
    .filter(isNonNullable);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const resolve = useCallback<NonNullable<CreateObjectPanelProps['resolve']>>(
    (typename) =>
      manager.context.getCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {},
    [manager],
  );

  const handleCreateObject = useCallback<NonNullable<CreateObjectPanelProps['onCreateObject']>>(
    ({ form, data = {} }) =>
      Effect.gen(function* () {
        if (!target) {
          // TODO(wittjosiah): UI feedback.
          return;
        }

        // NOTE: Must close before navigating or attention won't follow object.
        closeRef.current?.click();

        const space = isSpace(target) ? target : getSpace(target);
        invariant(space, 'Missing space');
        const { object } = yield* dispatch(form.getIntent(data, { space }));
        if (isLiveObject(object) && !Obj.instanceOf(StoredSchema, object)) {
          // TODO(wittjosiah): Selection in navtree isn't working as expected when hidden typenames evals to true.
          const hidden = form.hidden || hiddenTypenames.includes(Type.getTypename(form.objectSchema));
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
      }).pipe(Effect.runPromise),
    [dispatch, target, resolve, hiddenTypenames, _shouldNavigate],
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
              defaultValue: views ? 'View' : 'Item',
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
        forms={forms}
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
