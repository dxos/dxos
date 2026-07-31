//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceCapability, SpaceEvents } from '@dxos/plugin-space';

import { TableOperation } from '#types';

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CommentConfig = AppCapability.commentConfig(() => import('./comment-config'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));

// Genuine runtime event: fires whenever a new type is added to a space, not at startup.
export const OnTypeAdded = Capability.inlineModule(
  'on-type-added',
  { provides: [SpaceCapabilities.OnTypeAdded], activatesOn: SpaceEvents.TypeAdded },
  () =>
    Effect.succeed([
      Capability.contribute(SpaceCapabilities.OnTypeAdded, ({ db, type, show }) =>
        Operation.invoke(TableOperation.OnTypeAdded, { db, type, show }),
      ),
    ]),
);
