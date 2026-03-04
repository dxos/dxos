//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { toBinary } from '@dxos/protocols/buf';
import { type Presentation, PresentationSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

export interface EdgeIdentity {
  peerKey: string;
  identityKey: string;
  /**
   * Returns credential presentation issued by the identity key.
   * Presentation must have the provided challenge.
   * Presentation may include ServiceAccess credentials.
   */
  presentCredentials({ challenge }: { challenge: Uint8Array }): Promise<Presentation>;
}

export const handleAuthChallenge = async (failedResponse: Response, identity: EdgeIdentity): Promise<Uint8Array> => {
  invariant(failedResponse.status === 401);

  const headerValue = failedResponse.headers.get('Www-Authenticate');
  invariant(headerValue?.startsWith('VerifiablePresentation challenge='));

  const challenge = headerValue?.slice('VerifiablePresentation challenge='.length);
  invariant(challenge);

  const presentation = await identity.presentCredentials({ challenge: Buffer.from(challenge, 'base64') });
  return toBinary(PresentationSchema, presentation);
};
