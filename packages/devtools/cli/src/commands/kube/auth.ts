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

const getCredentials = async (
  client: Client,
  type: string,
  predicate?: (value: Credential) => boolean
): Promise<Credential[]> => {
  const credentialsQuery = client.halo.queryCredentials({ type });
  const trigger = new Trigger<Credential[]>();
  credentialsQuery.subscribe({
    onUpdate: (credentials: Credential[]) => {
      if (predicate) {
        credentials = credentials.filter(predicate);
      }
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
    this.log(chalk`{gray Initiating presentation sequence..}`);
    // TODO(egorgripasov): Find AuthorizedDevice by KubeAccess credential.
    const { deviceKey } = client.halo.device!;
    const authDeviceCreds = await getCredentials(client, 'dxos.halo.credentials.AuthorizedDevice', (cred) =>
      PublicKey.equals(cred.subject.id, deviceKey!)
    );

    if (!authDeviceCreds.length) {
      throw new Error('No authorized devices');
    }

    // Init auth sequence.
    return this.execWithSupervisor(async (supervisor: SupervisorRpcPeer) => {
      const { nonce, kubeKey } = await supervisor.rpc.initAuthSequence();

      // Find proper KubeAccess credential.
      const kubeAccessCreds = await getCredentials(client, 'dxos.halo.credentials.KubeAccess', (cred) =>
        PublicKey.equals(cred.issuer, kubeKey)
      );

      if (!kubeAccessCreds.length) {
        this.log(chalk`{gray No kube access credentials - requesting..}`);
      } else {
        this.log(chalk`{gray Kube access credentials found - requesting session token..}`);
      }

      const credsToPresent = [authDeviceCreds[0].id, kubeAccessCreds[0]?.id].filter(Boolean);
      // Create presentation.
      const presentation = await client.halo.presentCredentials({
        ids: credsToPresent as PublicKey[],
        nonce
      });

      return supervisor.rpc.authenticate({
        presentation
      });
    });
  }

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity;
      if (!identity) {
        // TODO(burdon): Error if called twice with no halo.
        //  Error [OpenError]: Error parsing JSON in /tmp/user-1/dx/cli/keystore/data.json: Unexpected end of JSON input
        this.log(chalk`{red Profile not initialized.}`);
      } else {
        const { credential, token } = await this.presentAuthCredentials(client);
        assert(!!credential || !!token, 'No credentials or token received.');

        if (token) {
          this.log(chalk`{green Authenticated with session token ${token}}`);
        } else {
          this.log(chalk`{gray Writing KUBE access credential..}`);
          await client.halo.writeCredentials([credential]);

          const { token } = await this.presentAuthCredentials(client);
          if (token) {
            this.log(chalk`{green Authenticated with session token: ${token}}`);
          } else {
            this.log(chalk`{red Failed to authenticate.}`);
          }
        }
      }
    });
  }
}
