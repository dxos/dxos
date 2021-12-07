//
// Copyright 2021 DXOS.org
//

import { Client, PartyProxy } from "@dxos/client";
import { SecretProvider } from "@dxos/credentials";
import { PublicKey } from "@dxos/crypto";

import { encodeInvitation } from "./utils";

export const generateInvitation = async (client: Client, party: PartyProxy) => {
  const partySecretString = PublicKey.random().toString();
  const partySecret = Buffer.from(partySecretString);
  const secretProvider: SecretProvider = async () => partySecret;
  const invitation = await client.echo.createInvitation(party.key, { secretProvider });
  return {
    invitationCode: encodeInvitation(invitation),
    secret: partySecretString
  };
}
