//
// Copyright 2026 DXOS.org
//

/**
 * The stored `AccessToken.token` is `<keyId>:<keySecret>` — exactly the value the API's
 * `Authorization: Key …` header carries — so a credential survives the single-string
 * `CredentialsService` contract. Returns undefined when either part is blank.
 */
export const joinCredential = (keyId: string, keySecret: string): string | undefined => {
  const id = keyId.trim();
  const secret = keySecret.trim();
  return id && secret ? `${id}:${secret}` : undefined;
};

/** Formats the `Authorization` header value for a stored credential. */
export const authorizationHeader = (credential: string): string => `Key ${credential}`;
