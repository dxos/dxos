//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';

import { type LighthouseClient, type LighthouseEndpoint } from '#client';
import { meta } from '#meta';

/**
 * Builds the client for a connection's endpoint. The plugin contributes the HTTP client; a host (a story, a test)
 * contributes another for the URLs it `match`es, so containers and operations never construct one themselves.
 */
export type ClientFactory = {
  match: (url: string) => boolean;
  make: (endpoint: LighthouseEndpoint) => LighthouseClient;
};

export const ClientFactory = Capability.make<ClientFactory>()(`${meta.profile.key}.capability.clientFactory`);
