//
// Copyright 2024 DXOS.org
//

import { Flags, ux } from '@oclif/core';
import chalk from 'chalk';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';

import { type Client } from '@dxos/client';
import { type CancellableInvitation } from '@dxos/client-protocol';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import { BaseCommand } from '../../base';
import { table } from '../../util';

export default class Share extends BaseCommand<typeof Share> {
  static override enableJsonFlag = true;
  static override description = 'List valid invitations.';

  static override flags = {
    ...BaseCommand.flags,
    truncate: Flags.boolean({
      description: 'Do not truncate keys.',
      default: true,
      allowNo: true,
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
        ux.stdout('HALO device invitations');
        ux.stdout(
          table(mappedInvitations, {
            invitationId: {
              header: 'Inv. ID',
              get: (row) => (this.flags.truncate ? row.invitationId.slice(0, 8) : row.invitationId),
            },
            swarmKey: {
              header: 'Swarm Key',
              get: (row) => (this.flags.truncate ? row.swarmKey.truncate() : row.swarmKey.toHex()),
            },
            created: { header: 'Created' },
            lifetime: { header: 'Lifetime' },
            expiry: {
              header: 'Expires in',
              get: (row) => (row.expiry ? formatDistanceToNow(row.expiry) : 'NEVER'),
            },
            persistent: {},
            state: { get: (row) => Invitation.State[row.state] },
          }),
        );
      }

      const spaces = client.spaces.get();
      const mappedSpaceInvitations = spaces.reduce((acc, space) => {
        const spaceInvitations = space.invitations.get();
        acc.push(...spaceInvitations);
        return acc;
      }, [] as CancellableInvitation[]);

      if (mappedSpaceInvitations.length > 0) {
        ux.stdout('Space invitations');
        ux.stdout(
          table(mapInvitations(mappedSpaceInvitations), {
            invitationId: {
              header: 'Inv. ID',
              get: (row) => (this.flags.truncate ? row.invitationId.slice(0, 8) : row.invitationId),
            },
            swarmKey: {
              header: 'Swarm Key',
              get: (row) => (this.flags.truncate ? row.swarmKey.truncate() : row.swarmKey.toHex()),
            },
            spaceKey: {
              header: 'Space Key',
              get: (row) => (this.flags.truncate ? row.spaceKey?.truncate() : row.spaceKey?.toHex()),
            },
            created: { header: 'Created' },
            lifetime: { header: 'Lifetime' },
            expiry: {
              header: 'Expires in',
              get: (row) => (row.expiry ? formatDistanceToNow(row.expiry) : 'NEVER'),
            },
            persistent: {},
            state: { get: (row) => Invitation.State[row.state] },
          }),
        );
      }
    });
  }
}

const mapInvitations = (invitations: CancellableInvitation[]) => {
  return invitations.map((invitation) => ({ ...invitation.get(), expiry: invitation.expiry }));
};
