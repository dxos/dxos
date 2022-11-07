//
// Copyright 2022 DXOS.org
//

import { log } from '@dxos/log';

export const invitationCodeFromUrl = (text: string) => {
  try {
    const searchParams = new URLSearchParams(text.substring(text.lastIndexOf('?')));
    const invitation = searchParams.get('invitation');
    return invitation ?? text;
  } catch (err) {
    log.catch(err);
  }
};
