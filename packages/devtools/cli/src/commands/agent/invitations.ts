//
// Copyright 2024 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import { formatDistanceToNow } from 'date-fns';

import { type Client } from '@dxos/client';
import { type CancellableInvitation } from '@dxos/client-protocol';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { BaseCommand } from '../../base-command';

export default class Share extends BaseCommand<typeof Share> {
  static override enableJsonFlag = true;
  static override description = 'List valid invitations.';

  static override flags = {
    ...super.flags,
    'no-truncate': Flags.boolean({
      description: 'Do not truncate keys.',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      if (!client.halo.identity.get()) {
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      }

      const haloInvitations = client.halo.invitations;
      const mappedInvitations = mapInvitations(haloInvitations.get());
      if (mappedInvitations.length > 0) {
        ux.log('HALO device invitations');
        ux.table(mappedInvitations, {
          invitationId: {
            header: 'Inv. ID',
            get: (row) => (this.flags['no-truncate'] ? row.invitationId : row.invitationId.slice(0, 8)),
          },
          swarmKey: {
            header: 'Swarm Key',
            get: (row) => (this.flags['no-truncate'] ? row.swarmKey.toHex() : row.swarmKey.truncate()),
          },
          created: { header: 'Created' },
          lifetime: { header: 'Lifetime' },
          expires: {
            header: 'Expires in',
            get: (row) => (row.expiry ? formatDistanceToNow(row.expiry) : 'NEVER'),
          },
          persistent: {},
          state: { get: (row) => Invitation.State[row.state] },
        });
      }

      const spaces = client.spaces.get();
      const mappedSpaceInvitations = spaces.reduce((acc, space) => {
        const spaceInvitations = space.invitations.get();
        acc.push(...spaceInvitations);
        return acc;
      }, [] as CancellableInvitation[]);

      if (mappedSpaceInvitations.length > 0) {
        ux.log('Space invitations');
        ux.table(mapInvitations(mappedSpaceInvitations), {
          invitationId: {
            header: 'Inv. ID',
            get: (row) => (this.flags['no-truncate'] ? row.invitationId : row.invitationId.slice(0, 8)),
          },
          swarmKey: {
            header: 'Swarm Key',
            get: (row) => (this.flags['no-truncate'] ? row.swarmKey.toHex() : row.swarmKey.truncate()),
          },
          spaceKey: {
            header: 'Space Key',
            get: (row) => (this.flags['no-truncate'] ? row.spaceKey?.toHex() : row.spaceKey?.truncate()),
          },
          created: { header: 'Created' },
          lifetime: { header: 'Lifetime' },
          expires: {
            header: 'Expires in',
            get: (row) => (row.expiry ? formatDistanceToNow(row.expiry) : 'NEVER'),
          },
          persistent: {},
          state: { get: (row) => Invitation.State[row.state] },
        });
      }
    });
  }
}

const mapInvitations = (invitations: CancellableInvitation[], options = { halo: false, truncateKeys: true }) => {
  return invitations.map((invitation) => {
    return { ...invitation.get(), expiry: invitation.expiry };
  });
};
