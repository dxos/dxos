//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import DigitalOcean from 'do-wrapper';

import { waitForCondition } from '@dxos/async';
import type { Config } from '@dxos/client';

import { KUBE_TAG, KubeDeployOptions, Provider } from './provider';

const DEFAULT_REGION = 'nyc3';
const DEFAULT_MEMORY = 4;

export class DigitalOceanProvider implements Provider {
  _session: any;

  constructor(config: Config) {
    const doAccessToken = config.get('runtime.services.machine.doAccessToken');
    assert(doAccessToken, 'Invalid DigitalOcean Access Token.');

    this._session = new DigitalOcean(doAccessToken, 100);
  }

  async getDropletIdFromName(name: string) {
    assert(name);

    const result = await this._session.droplets.getAll();
    const [targetDroplet] = result.droplets.filter((droplet: any) => droplet.name === name) || [];
    return targetDroplet ? targetDroplet.id : undefined;
  }

  async getSshKeys() {
    const result = await this._session.keys.getAll();
    return result.ssh_keys?.map((key: any) => key.fingerprint);
  }

  async deploy(options: KubeDeployOptions) {
    const { hostname: name, region = DEFAULT_REGION, memory = DEFAULT_MEMORY, dev, accessToken } = options;

    const dropletId = await this.getDropletIdFromName(name);
    if (dropletId) {
      throw new Error(`${name} already exists.`);
    }

    const channel = dev ? 'dev' : 'latest';

    const cloudConfigScript =
      `
         #cloud-config

         package_update: true

         package_upgrade: true

         packages:
           - python
           - build-essential
           - docker-ce
           - docker-ce-cli

         apt:
           sources:
             docker.list:
               source: deb [arch=amd64] https://download.docker.com/linux/ubuntu $RELEASE stable
               keyid: 9DC858229FC7DD38854AE2D88D81803C0EBFCD88
        ` +
      (accessToken
        ? `
         write_files:
           - path: /root/.kube/acl/seed.yaml
             content: |
               - entity: "${accessToken}"
                 capabilities:
                   - 100
                 subject: "*"
        `
        : '') +
      `
         runcmd:
           - curl -L "https://github.com/docker/compose/releases/download/1.27.4/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
           - chmod +x /usr/local/bin/docker-compose
           - ch=${channel} bash -c "$(curl -fsSL https://dxos.nyc3.digitaloceanspaces.com/install.sh)"
           - kube start
        `;

    let sizeSlug = 's-2vcpu-4gb';
    switch (memory) {
      case 1:
        sizeSlug = 's-1vcpu-1gb';
        break;
      case 2:
        sizeSlug = 's-2vcpu-2gb';
        break;
      case 4:
        sizeSlug = 's-2vcpu-4gb';
        break;
      case 8:
        sizeSlug = 's-4vcpu-8gb';
        break;
      case 16:
        sizeSlug = 's-8vcpu-16gb';
        break;
      case 32:
        sizeSlug = 's-8vcpu-32gb';
        break;
    }

    const sshKeys = await this.getSshKeys();

    assert(sshKeys.length, 'No SSH keys found.');

    const createParameters = {
      name,
      region,
      size: sizeSlug,
      image: 'ubuntu-22-10-x64',
      ssh_keys: sshKeys,
      user_data: cloudConfigScript,
      tags: [KUBE_TAG]
    };

    const result = await this._session.droplets.create(createParameters);
    const droplet = await waitForCondition(
      async () => {
        const { droplet } = await this._session.droplets.getById(result.droplet.id);
        if (droplet?.networks.v4.find((net: any) => net.type === 'public').ip_address) {
          return droplet;
        }
        return undefined;
      },
      0,
      1000
    );

    const ipAddress = droplet.networks.v4.find((net: any) => net.type === 'public').ip_address;

    return {
      hostname: droplet.name,
      createdAt: droplet.created_at,
      ipAddress
    };
  }
}
