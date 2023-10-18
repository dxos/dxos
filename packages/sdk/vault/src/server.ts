//
// Copyright 2023 DXOS.org
//

import corsPlugin from '@fastify/cors';
import staticPlugin from '@fastify/static';
import fastify from 'fastify';
import defaultsDeep from 'lodash.defaultsdeep';
import { join } from 'node:path';
import pkgDir from 'pkg-dir';

import { definitions, type ConfigPluginOpts } from '@dxos/config';
import { invariant } from '@dxos/invariant';

export type StartVaultOptions = {
  config?: ConfigPluginOpts;
};

export const startVault = async ({ config: configOptions = {} }: StartVaultOptions = {}) => {
  const { __CONFIG_DEFAULTS__, __CONFIG_LOCAL__, __CONFIG_ENVS__ } = definitions(configOptions);
  const config = defaultsDeep(__CONFIG_LOCAL__, __CONFIG_ENVS__, __CONFIG_DEFAULTS__);

  const server = fastify();

  await server.register(corsPlugin);

  const packageDir = await pkgDir(__dirname);
  invariant(packageDir, 'Could not find @dxos/vault package.json');
  const root = join(packageDir, './dist/bundle');
  await server.register(staticPlugin, { root });

  server.get('/.well-known/dx/config', async (req, reply) => {
    void reply.headers({
      'Content-Type': 'application/json',
    });
    void reply.send(JSON.stringify(config));
  });

  server.listen({ port: 3967, host: '0.0.0.0' }, (err) => {
    if (err) {
      console.log('Vault already running on port 3967');
    } else {
      console.log('Started vault on port 3967');
    }
  });
};
