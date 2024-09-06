//
// Copyright 2024 DXOS.org
//

import { type DID } from 'iso-did/types';

import { Trigger } from '@dxos/async';
import { type Config } from '@dxos/client';
import { type Halo } from '@dxos/client-protocol';
import { type ObjectMeta } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { codec } from './codec';
import { matchServiceCredential } from './hub-protocol';

// TODO: use URL scheme for source?
const USERFUNCTIONS_META_KEY = 'dxos.org/service/function';
const USERFUNCTIONS_CREDENTIAL_CAPABILITY = 'composer:beta';

// TODO: Synchronize API types with server
export type UserFunctionUploadResult = {
  result: 'success' | 'error';
  errorMessage?: string;
  functionId?: string;
  functionVersionNumber?: number;
};

export type UploadWorkerProps = {
  clientConfig: Config;
  halo: Halo;
  name?: string;
  source: string;
  functionId?: string;
  ownerDid: DID;
  credentialLoadTimeout?: number; // ms to wait for credentials to load
};

const defaultUserFunctionsBaseUrl = 'https://functions-staging.dxos.workers.dev'; // 'http://localhost:8600';

const getBaseUrl = (config: Config) => {
  return config.get('runtime.app.env.DX_FUNCTIONS_SERVICE_HOST') || defaultUserFunctionsBaseUrl;
};

export const uploadWorkerFunction = async ({
  clientConfig,
  halo,
  name,
  source,
  ownerDid,
  functionId,
  credentialLoadTimeout,
}: UploadWorkerProps) => {
  const identity = halo.identity.get();
  if (!identity) {
    throw new Error('Identity not available');
  }
  const userFunctionsBaseUrl = getBaseUrl(clientConfig);

  // TODO: codify naming convention
  const uploadUrl = `${userFunctionsBaseUrl}/${ownerDid}` + (functionId ? `/${functionId}` : '');

  log('Upload', { functionId, source, name, identityKey: identity.identityKey, uploadUrl: uploadUrl.toString() });
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: JSON.stringify({ script: source, name }),
    headers: await presentationForIdentity({ halo, timeout: credentialLoadTimeout }),
  });
  if (!response.ok) {
    return (await response.json()) as UserFunctionUploadResult;
  }

  const res = await response.json();
  log('Upload response', { status: response.status, res });

  return res as UserFunctionUploadResult;
};

export const getUserFunctionUrlInMetadata = (meta: ObjectMeta) => {
  return meta.keys.find((key) => key.source === USERFUNCTIONS_META_KEY)?.id;
};

export const setUserFunctionUrlInMetadata = (meta: ObjectMeta, functionUrl: string) => {
  const key = meta.keys.find((key) => key.source === USERFUNCTIONS_META_KEY);
  if (key) {
    if (key.id !== functionUrl) {
      throw new Error('Metadata mismatch');
    }
  } else {
    meta.keys.push({ source: USERFUNCTIONS_META_KEY, id: functionUrl });
  }
};

// TODO: handle team owner

const presentationForIdentity = async ({ halo, timeout }: { halo: Halo; timeout?: number }) => {
  let credential: Credential | undefined;

  if (timeout) {
    const credentialsLoaded = new Trigger();
    halo.credentials.subscribe((c) => {
      credential = c.find(matchServiceCredential([USERFUNCTIONS_CREDENTIAL_CAPABILITY]));
      if (credential) {
        credentialsLoaded.wake();
      }
    });
    await credentialsLoaded.wait({
      timeout,
    });
  } else {
    credential = halo
      .queryCredentials()
      .toSorted((a, b) => b.issuanceDate.getTime() - a.issuanceDate.getTime())
      .find(matchServiceCredential([USERFUNCTIONS_CREDENTIAL_CAPABILITY]));
  }

  if (!credential) {
    throw new Error('No credential found');
  }
  log('credential found', { credential });
  // TODO(wittjosiah): If id is required to present credentials, then it should always be present for queried credentials.
  invariant(credential.id, 'beta credential missing id');
  const presentation = await halo.presentCredentials({ ids: [credential.id] });

  return { Authorization: `Bearer ${codec.encode(presentation)}` };
};
