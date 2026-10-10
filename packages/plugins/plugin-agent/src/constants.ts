//
// Copyright 2026 DXOS.org
//

import { DXN } from '@dxos/keys';

import { meta } from '#meta';

/** Surface id of the dialog that invites an agent into another space. */
export const INVITE_AGENT_DIALOG = DXN.make(`${meta.profile.key}.inviteAgentDialog`);
