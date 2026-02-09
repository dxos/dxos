import * as IdentityPb from '@dxos/protocols/buf/dxos/client/services_pb';
import * as InvitationsPb from '@dxos/protocols/buf/dxos/halo/invitations_pb';

import type * as Rpc from './Rpc.ts';

export interface IdentityService extends Rpc.BufRpcHandlers<typeof IdentityPb.IdentityService> {}

export interface InvitationsService extends Rpc.BufRpcHandlers<typeof IdentityPb.InvitationsService> {}

export interface DevicesService extends Rpc.BufRpcHandlers<typeof IdentityPb.DevicesService> {}