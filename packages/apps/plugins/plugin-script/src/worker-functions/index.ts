//
// Copyright 2024 DXOS.org
//

import { type Halo } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { codec } from './codec';
import { matchServiceCredential } from './hub-protocol';

export type UploadResult = string;

export type UploadWorkerProps = {
  halo: Halo;
  source: string;
  functionId: string;
  moduleId: string;
  ownerId: string;
};

const userFunctionsBaseUrl = 'http://localhost:8600';
// const userFunctionsBaseUrl = 'https://functions-nftest.dxos.workers.dev';

export const uploadWorkerFunction = async ({ halo, source, ownerId, moduleId, functionId }: UploadWorkerProps) => {
  const identity = await halo.identity.get();
  if (!identity) {
    throw new Error('Identity not available');
  }

  // TODO: codify naming convention
  const uploadUrl = `${userFunctionsBaseUrl}/${ownerId}/${moduleId}/${functionId}`;

  log('Upload', { functionId, source, identityKey: identity.identityKey, uploadUrl: uploadUrl.toString() });
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: JSON.stringify({ script: source }),
    headers: await presentationForIdentity({ halo }),
  });

  log('Upload response', { status: response.status, statusText: response.statusText });

  if (!response.ok) {
    return (await response.text()) as UploadResult;
  }

  const res = await response.json();
  return res.path as UploadResult;
};

// TODO: handle team owner

const presentationForIdentity = async ({ halo }: { halo: Halo }) => {
  const credential = halo
    .queryCredentials()
    .toSorted((a, b) => b.issuanceDate.getTime() - a.issuanceDate.getTime())
    .find(matchServiceCredential(['composer:beta']));
  invariant(credential, 'No  credential found');

  log('credential found', { credential });
  // TODO(wittjosiah): If id is required to present credentials, then it should always be present for queried credentials.
  invariant(credential.id, 'beta credential missing id');
  const presentation = await halo.presentCredentials({ ids: [credential.id] });

  return { Authorization: `Bearer ${codec.encode(presentation)}` };
};

export const registerOwner = async ({ halo }: { halo: Halo }) => {
  const getResponse = await fetch(`${userFunctionsBaseUrl}/registration/owner?getOwnerFromIdentity=true`, {});

  if (getResponse.ok) {
    const jsonResponse = await getResponse.json();
    log('existing owner', { jsonResponse });
    return jsonResponse.id;
  }

  const createResponse = await fetch(`${userFunctionsBaseUrl}/registration/owner`, {
    method: 'POST',
    headers: await presentationForIdentity({ halo }),
  });
  if (!createResponse.ok) {
    throw new Error('owner registration', { cause: createResponse.statusText });
  }
  const jsonResponse = await createResponse.json();
  log('created owner', { jsonResponse });
  return jsonResponse.id;
};
