//
// Copyright 2026 DXOS.org
//

import { EID } from '@dxos/keys';
import { type Integration } from '@dxos/plugin-integration';

/**
 * Finds the integration that syncs a given local object (mailbox or calendar), matching a target by
 * its ECHO object uri or by the object's remote (Google) id.
 */
export const findIntegrationForRemote = (
  integrations: readonly Integration.Integration[],
  localId: string,
  remoteId: string,
): Integration.Integration | undefined =>
  integrations.find(
    (integration) =>
      integration.targets?.some((target) => {
        if (target.object) {
          const parsed = EID.tryParse(target.object.uri);
          if (parsed && EID.getEntityId(parsed) === localId) {
            return true;
          }
        }
        return target.remoteId === remoteId;
      }) ?? false,
  );
