//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring } from '../keys';
import { unwrapEnvelopes, extractContents, unwrapMessage, wrapMessage } from '../party/party-credential';
import { DeviceInfo, IdentityInfo, KeyRecord, Message, SignedMessage } from '../proto';
import { WithTypeUrl } from '../proto/any';

/**
 * Return the __type_url, if present.
 * @param message
 */
function getTypeUrl (message: any) {
  // eslint-disable-next-line camelcase
  return message?.__type_url;
}

/**
 * Creates a DeviceInfo SignedMessage.
 */
export const createDeviceInfoMessage = (keyring: Keyring, displayName: string, deviceKey: KeyRecord): Message => {
  assert(keyring);
  assert(displayName);
  assert(deviceKey);

  const message: WithTypeUrl<DeviceInfo> = {
    __type_url: 'dxos.credentials.identity.DeviceInfo',
    publicKey: deviceKey.publicKey,
    displayName
  };

  return wrapMessage(keyring.sign(message, [deviceKey]));
};

/**
 * Creates a IdentityInfo SignedMessage.
 */
export const createIdentityInfoMessage = (keyring: Keyring, displayName: string, identityKey: KeyRecord): Message => {
  assert(keyring);
  assert(displayName);
  assert(identityKey);

  const message: WithTypeUrl<IdentityInfo> = {
    __type_url: 'dxos.credentials.identity.IdentityInfo',
    publicKey: identityKey.publicKey,
    displayName
  };

  return wrapMessage(keyring.sign(message, [identityKey]));
};

/**
 * Returns true if the message is an Identity-related message, else false.
 * @param {Message} message
 * @return {boolean}
 */
export const isIdentityMessage = (message: Message | SignedMessage) => {
  message = extractContents(unwrapEnvelopes(unwrapMessage(message)));
  const type = getTypeUrl(message);

  // Since message.payload may not exist, make safe and return false.
  return type && type.startsWith('dxos.credentials.identity.');
};

/**
 * Returns true if the message is a DeviceInfo message, else false.
 * @param {SignedMessage} message
 * @return {boolean}
 */
export const isDeviceInfoMessage = (message: Message | SignedMessage) => {
  message = extractContents(unwrapEnvelopes(unwrapMessage(message)));
  const type = getTypeUrl(message);

  return type === 'dxos.credentials.identity.DeviceInfo';
};

/**
 * Returns true if the message is a IdentityInfo message, else false.
 * @param {SignedMessage} message
 * @return {boolean}
 */
export const isIdentityInfoMessage = (message: Message | SignedMessage) => {
  message = extractContents(unwrapEnvelopes(unwrapMessage(message)));
  const type = getTypeUrl(message);

  return type === 'dxos.credentials.identity.IdentityInfo';
};
