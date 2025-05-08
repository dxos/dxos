//
// Copyright 2023 DXOS.org
// Copyright 2020 Google LLC
// https://github.com/googleapis/nodejs-local-auth/blob/main/src/index.ts
//

import fs from 'fs';
import { OAuth2Client } from 'google-auth-library';
import * as http from 'http';
import yaml from 'js-yaml';
import { type AddressInfo } from 'net';
import { spawn } from 'node:child_process';
import destroyer from 'server-destroy';
import { URL } from 'url';

const isAddressInfo = (addr: string | AddressInfo | null): addr is AddressInfo =>
  (addr as AddressInfo).port !== undefined;

export interface LocalAuthOptions {
  keyfilePath: string;
  scopes: string[] | string;
}

/**
 * Opens browser to perform OAuth flow.
 * @param options
 */
export const authenticate = async (options: LocalAuthOptions): Promise<OAuth2Client> => {
  if (!options || !options.keyfilePath || typeof options.keyfilePath !== 'string') {
    throw new Error('keyfilePath must be set to the fully qualified path to a GCP credential keyfile.');
  }

  // "redirect_uris": [
  //   "http://localhost:3000/oauth2callback"
  // ]
  const keyFile = yaml.load(String(fs.readFileSync(options.keyfilePath))) as any;
  const keys = keyFile.installed || keyFile.web;
  if (!keys.redirect_uris || keys.redirect_uris.length === 0) {
    throw new Error('set redirect_uris');
  }

  const redirectUri = new URL(keys.redirect_uris[0] ?? 'http://localhost');
  if (redirectUri.hostname !== 'localhost') {
    throw new Error('set redirect_uris');
  }

  // create an oAuth client to authorize the API call
  const client = new OAuth2Client({
    clientId: keys.client_id,
    clientSecret: keys.client_secret,
  });

  return new Promise((resolve, reject) => {
    // TODO(burdon): Configure get handler.
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url!, 'http://localhost:3000');
        if (url.pathname !== redirectUri.pathname) {
          res.end('Invalid callback URL');
          return;
        }
        const searchParams = url.searchParams;
        if (searchParams.has('error')) {
          res.end('Authorization rejected.');
          reject(new Error(searchParams.get('error')!));
          return;
        }
        if (!searchParams.has('code')) {
          res.end('No authentication code provided.');
          reject(new Error('Cannot read authentication code.'));
          return;
        }

        const code = searchParams.get('code');

        const { tokens } = await client.getToken({
          code: code!,
          redirect_uri: redirectUri.toString(),
        });

        client.credentials = tokens;
        resolve(client);

        res.end('Authentication successful. Return to the console.');
      } catch (err) {
        reject(err);
      } finally {
        (server as any).destroy();
      }
    });

    let listenPort = 3000;
    if (keyFile.installed) {
      // Use ephemeral port if not a web client.
      listenPort = 0;
    } else if (redirectUri.port !== '') {
      listenPort = Number(redirectUri.port);
    }

    server.listen(listenPort, async () => {
      const address = server.address();
      if (isAddressInfo(address)) {
        redirectUri.port = String(address.port);
      }

      const scopes = options.scopes ? (Array.isArray(options.scopes) ? options.scopes : [options.scopes]) : [];
      const authorizeUrl = client.generateAuthUrl({
        redirect_uri: redirectUri.toString(),
        access_type: 'offline',
        scope: scopes.join(' '),
      });

      spawn('open', [authorizeUrl]);
    });

    destroyer(server);
  });
};
