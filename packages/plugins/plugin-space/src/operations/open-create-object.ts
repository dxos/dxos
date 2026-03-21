// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Collection, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { CREATE_OBJECT_DIALOG } from '../constants';
import { SpaceCapabilities } from '../types';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenCreateObject> = SpaceOperation.OpenCreateObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const ephemeralState = yield* Capabilities.getAtomValue(SpaceCapabilities.EphemeralState);
      const navigable = input.navigable ?? true;
      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: CREATE_OBJECT_DIALOG,
        blockAlign: 'start',
        props: {
          target: input.target,
          views: input.views,
          typename: input.typename,
          initialFormValues: input.initialFormValues,
          onCreateObject: input.onCreateObject,
          targetNodeId: input.targetNodeId,
          shouldNavigate: navigable
            ? (object: Obj.Unknown) => {
                const isCollection = Obj.instanceOf(Collection.Collection, object);
                return !isCollection || ephemeralState.navigableCollections;
              }
            : () => false,
        },
      });
    }),
  ),
);
export default handler;
