//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter } from '@dxos/echo';
import { ApiKeyAuth, EdgeHttpClient, HubHttpClient } from '@dxos/edge-client';
import { Integration } from '@dxos/plugin-integration';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';

export type AdminClients = {
  /** Hub-service admin routes (accounts, codes, waitlist, messages, templates, …). */
  hub: HubHttpClient;
  /** Edge worker admin routes (spaces, identities, durable objects, purge). */
  edge: EdgeHttpClient;
};

/**
 * Resolves the hub + edge URLs and the admin token from the `edge` integration,
 * returning real {@link HubHttpClient} / {@link EdgeHttpClient} instances
 * authenticated with a static admin key ({@link ApiKeyAuth}). Returns `undefined`
 * until the token and both URLs are available.
 */
export const useEdgeAdminClient = (): AdminClients | undefined => {
  const client = useClient();
  const space = useActiveSpace();
  const integrations = useQuery(space?.db, Filter.type(Integration.Integration));
  const edgeIntegration = integrations.find((integration) => integration.providerId === 'edge');
  const token = edgeIntegration?.accessToken?.target?.token;
  const hubBaseUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL as string | undefined;
  const edgeBaseUrl = client.config.values?.runtime?.services?.edge?.url as string | undefined;

  return useMemo(() => {
    if (!token || !hubBaseUrl || !edgeBaseUrl) {
      return undefined;
    }
    return {
      hub: new HubHttpClient(hubBaseUrl, { auth: new ApiKeyAuth(token) }),
      edge: new EdgeHttpClient(edgeBaseUrl, { auth: new ApiKeyAuth(token) }),
    };
  }, [token, hubBaseUrl, edgeBaseUrl]);
};
