//
// Copyright 2024 DXOS.org
//

import { Effect, pipe } from 'effect';
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
import { Query, Type, type Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { getSpace, isLiveObject, isSpace, type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Button, Dialog, Icon, useTranslation } from '@dxos/react-ui';
import { cardDialogContent, cardDialogHeader } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { CreateObjectPanel, type CreateObjectPanelProps } from './CreateObjectPanel';
import { SpaceCapabilities } from '../../capabilities';
import { SPACE_PLUGIN } from '../../meta';
import { SpaceAction } from '../../types';

export const CREATE_OBJECT_DIALOG = `${SPACE_PLUGIN}/CreateObjectDialog`;

export type CreateObjectDialogProps = Pick<CreateObjectPanelProps, 'target' | 'typename' | 'name'> & {
  shouldNavigate?: (object: Obj.Any) => boolean;
};

export const CreateObjectDialog = ({
  target: initialTarget,
  typename: initialTypename,
  name,
  shouldNavigate: _shouldNavigate,
}: CreateObjectDialogProps) => {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const manager = usePluginManager();
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const spaces = useSpaces();
  const { dispatch } = useIntentDispatcher();
  const forms = useCapabilities(SpaceCapabilities.ObjectForm);
  const [target, setTarget] = useState<Space | DataType.Collection | undefined>(initialTarget);
  const [typename, setTypename] = useState<string | undefined>(initialTypename);
  const space = isSpace(target) ? target : getSpace(target);
  const queryCollections = useQuery(space, Query.type(DataType.QueryCollection));
  const hiddenTypenames = queryCollections.map((collection) => collection.query.typename).filter(isNonNullable);

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
        const { object, relation } = yield* dispatch(form.getIntent(data, { space }));
        if (isLiveObject(relation)) {
          yield* dispatch(createIntent(SpaceAction.AddObject, { target: space, object: relation, hidden: true }));
        }

        if (isLiveObject(object)) {
          // TODO(wittjosiah): Selection in navtree isn't working as expected when hidden typenames evals to true.
          const hidden = form.hidden || hiddenTypenames.includes(Type.getTypename(form.objectSchema));
          const addObjectIntent = createIntent(SpaceAction.AddObject, { target, object, hidden });
          const shouldNavigate = _shouldNavigate ?? (() => true);
          if (shouldNavigate(object)) {
            yield* dispatch(pipe(addObjectIntent, chain(LayoutAction.Open, { part: 'main' })));
          } else {
            yield* dispatch(addObjectIntent);
          }
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
          {t('create object dialog title', { object: t('typename label', { ns: typename, defaultValue: 'Item' }) })}
        </Dialog.Title>
        <Dialog.Close asChild>
          <Button ref={closeRef} density='fine' variant='ghost' autoFocus>
            <Icon icon='ph--x--regular' size={4} />
          </Button>
        </Dialog.Close>
      </div>

      <CreateObjectPanel
        forms={forms}
        spaces={spaces}
        target={target}
        typename={typename}
        name={name}
        defaultSpaceId={client.spaces.default.id}
        resolve={resolve}
        onTargetChange={setTarget}
        onTypenameChange={setTypename}
        onCreateObject={handleCreateObject}
      />
    </Dialog.Content>
  );
};
