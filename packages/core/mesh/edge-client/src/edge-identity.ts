//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { schema } from '@dxos/protocols/proto';
import { type Presentation } from '@dxos/protocols/proto/dxos/halo/credentials';

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
  return schema.getCodecForType('dxos.halo.credentials.Presentation').encode(presentation);
};
