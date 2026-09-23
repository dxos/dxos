//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as EffectContext from 'effect/Context';

import { type IdentityLifecycle } from './internal/identity/identity-lifecycle.ts';
import { type IdentityManager, type IdentityProvider } from './internal/identity/identity-manager.ts';
import { type InvitationsManager } from './internal/invitations/invitations-manager.ts';
import { type DataSpaceManager, type SigningContextProvider } from './internal/spaces/data-space-manager.ts';

//
// Service tags for components whose consumers must not depend on the implementing module. Every
// import here is type-only, so the tags carry no runtime edge and a consumer declaring a
// dependency does not pull in the implementation. Tags whose consumers all sit above the
// implementation stay next to it.
//

/** Effect service tag for {@link IdentityManager}. */
export class IdentityManagerService extends EffectContext.Service<IdentityManagerService, IdentityManager>()(
  '@dxos/client-services/IdentityManager',
) {}

/** Effect service tag for {@link IdentityProvider}. */
export class IdentityProviderService extends EffectContext.Service<IdentityProviderService, IdentityProvider>()(
  '@dxos/client-services/IdentityProvider',
) {}

/** Effect service tag for {@link IdentityLifecycle}. */
export class IdentityLifecycleService extends EffectContext.Service<IdentityLifecycleService, IdentityLifecycle>()(
  '@dxos/client-services/IdentityLifecycle',
) {}

/** Effect service tag for {@link InvitationsManager}. */
export class InvitationsManagerService extends EffectContext.Service<InvitationsManagerService, InvitationsManager>()(
  '@dxos/client-services/InvitationsManager',
) {}

/** Effect service tag for {@link DataSpaceManager}. */
export class DataSpaceManagerService extends EffectContext.Service<DataSpaceManagerService, DataSpaceManager>()(
  '@dxos/client-services/DataSpaceManager',
) {}

/** Effect service tag for {@link SigningContextProvider}. */
export class SigningContextProviderService extends EffectContext.Service<
  SigningContextProviderService,
  SigningContextProvider
>()('@dxos/client-services/SigningContextProvider') {}
