//
// Copyright 2024 DXOS.org
//

import { log } from '@dxos/log';

import { type User } from './users';
import { str } from './util';

// TODO(burdon): YAML file for config.
const DISCORD_INVITE_URL = 'https://discord.gg/PTA7ThQQ';

export type MailResponse = {
  errors?: string[];
};

// TODO(burdon/nf): Eval security concerns that have been flagged for MailChannels. Assess if lockdown resolves the issue:
//  https://discord.com/channels/595317990191398933/779390076219686943/1152689451374477483
//  Otherwise consider sendgrid.

/**
 * Sending email requires TXT records to configure domain lockdown and SPF.
 * NOTE: MailChannels relay is restricted to CF prod workers (doesn't work in local dev server).
 *
 * https://developers.cloudflare.com/pages/functions/plugins/mailchannels
 * https://support.mailchannels.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Send-API
 * https://support.mailchannels.com/hc/en-us/articles/16918954360845-Secure-your-domain-name-against-spoofing-with-Domain-Lockdown
 */
export const sendEmail = async (user: User) => {
  log.info('sending email', { user });

  const request = new Request('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [
            {
              email: user.email,
            },
          ],
        },
      ],
      from: {
        email: 'hello@dxos.org',
        name: 'DXOS',
      },
      subject: 'Hello from DXOS!',
      content: [
        {
          type: 'text/plain',
          value: str(
            'Thank you for your interest in the Composer Beta.\n\n',
            'We will be back in touch as soon as we can support adding you to the beta program.\n\n',
            `Please consider joining our Discord: ${DISCORD_INVITE_URL}`,
          ),
        },
      ],
    }),
  });

  const result = await fetch(request);
  return await result.json<MailResponse>();
};
