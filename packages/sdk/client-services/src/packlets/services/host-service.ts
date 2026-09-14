//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { type ClientServicesHost } from './service-host.ts';

/**
 * Context tag for the {@link ClientServicesHost}. The host provides itself under this tag when it
 * builds its component stack, so client RPC handler layers can resolve the orchestration entry
 * points (`createIdentity`, readiness gates, …) they need. Lives apart from the host class so the
 * handler layers can import the tag without a runtime cycle through the host's own layer imports.
 */
export class ClientServicesHostService extends EffectContext.Service<ClientServicesHostService, ClientServicesHost>()(
  '@dxos/client-services/ClientServicesHost',
) {}
