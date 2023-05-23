//
// Copyright 2022 DXOS.org
//

import urlJoin from 'url-join';

import { log } from '@dxos/log';

/**
 * @deprecated
 */
// TODO(burdon): Factor out.
export const invitationCodeFromUrl = (text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchParams.get('invitation');
    return invitation ?? text;
  } catch (err) {
    log.catch(err);
    return text;
  }
};

/**
 * @deprecated
 */
// TODO(burdon): Factor out.
export const createInvitationUrl = (path: string, invitationCode: string) => {
  const { origin, pathname } = window.location;
  return urlJoin(origin, pathname, `/#${path}`, `?invitation=${invitationCode}`);
};
