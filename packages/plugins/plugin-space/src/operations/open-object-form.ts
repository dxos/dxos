// Copyright 2025 DXOS.org

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Collection, Obj, type Ref } from '@dxos/echo';

import { SpaceCapabilities, SpaceOperation } from '#types';

import { OBJECT_FORM_DIALOG } from '../constants.ts';
import { makeObjectFormHandle } from '../util/index.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.OpenObjectForm> = SpaceOperation.OpenObjectForm.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const ephemeralState = yield* Capabilities.getAtomValue(SpaceCapabilities.EphemeralState);
      const navigable = input.navigable ?? true;
      // The operation's result is the dialog's, so the handler stays suspended for as long as the
      // dialog is up; the handle is settled once, from the confirm button or the unmount cleanup.
      const result = yield* Deferred.make<Ref.Ref<Obj.Unknown> | undefined>();
      const handle = makeObjectFormHandle((object) => {
        Deferred.doneUnsafe(result, Effect.succeed(object));
      });

      yield* Operation.invoke(LayoutOperation.UpdateDialog, {
        subject: OBJECT_FORM_DIALOG,
        blockAlign: 'start',
        props: {
          target: input.target,
          mode: input.mode,
          views: input.views,
          typename: input.typename,
          schema: input.schema,
          defaults: input.defaults,
          targetNodeId: input.targetNodeId,
          handle,
          shouldNavigate: navigable
            ? (object: Obj.Unknown) => {
                const isCollection = Obj.instanceOf(Collection.Collection, object);
                return !isCollection || ephemeralState.navigableCollections;
              }
            : () => false,
        },
      });

      return yield* Deferred.await(result);
    }),
  ),
);
export default handler;
