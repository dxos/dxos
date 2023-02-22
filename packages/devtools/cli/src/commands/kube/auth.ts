//
// Copyright 2023 DXOS.org
//

import chalk from 'chalk';
import assert from 'node:assert';

import { Trigger, asyncTimeout } from '@dxos/async';
import { Client } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { BaseCommand } from '../../base-command';
import { SupervisorRpcPeer } from '../../util';

const timeout = 500;

const findCredentials = async (client: Client, type: string): Promise<Credential[]> => {
  const credentialsQuery = client.halo.queryCredentials({ type });
  const trigger = new Trigger<Credential[]>();
  credentialsQuery.subscribe({
    onUpdate: (credentials) => {
      if (credentials.length) {
        trigger.wake(credentials);
      }
    },
    onError: (err) => {
      throw err;
    }
  });

  try {
    return await asyncTimeout(trigger.wait(), timeout);
  } catch (err) {
    return [];
  }
};

export default class Auth extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Authenticate with KUBE.';

  async presentAuthCredentials(client: Client): Promise<any> {
    const kubeAccessCreds = await findCredentials(client, 'dxos.halo.credentials.KubeAccess');
    // TODO(egorgripasov): Find AuthorizedDevice by KubeAccess credential.
    const authDeviceCreds = await findCredentials(client, 'dxos.halo.credentials.AuthorizedDevice');

    if (!authDeviceCreds.length) {
      this.log(chalk`{red No authorized devices.}`);
      return {};
    }

    // Init auth sequence.
    return this.execWithSupervisor(async (supervisor: SupervisorRpcPeer) => {
      const { nonce, kubeKey } = await supervisor.rpc.initAuthSequence();

      // Find proper KubeAccess credential.
      const kubeAccessCred = kubeAccessCreds.find((cred) => PublicKey.equals(cred.issuer, kubeKey));
      const credsToPresent = [authDeviceCreds[0].id, kubeAccessCred?.id].filter(Boolean);
      // Create presentation.
      const presentation = await client.halo.presentCredentials({
        // TODO(egorgripasov): Present all credentials.
        id: credsToPresent[0]!,
        nonce
      });

      return supervisor.rpc.authenticate({
        presentation
      });
    });
  }

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const profile = client.halo.profile;
      if (!profile) {
        // TODO(burdon): Error if called twice with no halo.
        //  Error [OpenError]: Error parsing JSON in /tmp/user-1/dx/cli/keystore/data.json: Unexpected end of JSON input
        this.log(chalk`{red Profile not initialized.}`);
        return {};
      } else {
        const { credential, token } = await this.presentAuthCredentials(client);
        assert(!!credential || !!token, 'No credentials or token received.');

        if (token) {
          this.log(chalk`{green Authenticated with token ${token}}`);
        } else {
          // Store credential.
          // Run presentation again.
        }
      }
    });
  }
}
