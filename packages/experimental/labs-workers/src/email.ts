//
// Copyright 2024 DXOS.org
//

import { HTTPException } from 'hono/dist/types/http-exception';

import { log } from '@dxos/log';

import { type User } from './users';
import { str } from './util';

export type MailRequest = {
  subject: string;
  content: string;
};

// TODO(burdon/nf): Eval security concerns that have been flagged for MailChannels. Assess if lockdown resolves the issue:
//  https://discord.com/channels/595317990191398933/779390076219686943/1152689451374477483
//  Otherwise consider sendgrid.

export const createMessage = (template: MailRequest, props: Record<string, string>): MailRequest => {
  let { subject, content } = template;
  for (const [key, value] of Object.entries(props)) {
    content = content.replace(new RegExp(`{${key}}`, 'g'), value);
  }

  return { subject, content };
};

// TODO(burdon): Import templates as static resources.
export const templates: Record<string, MailRequest> = {
  signup: {
    subject: 'Hello from DXOS!',
    content: str(
      'Thank you for your interest in the Composer Beta.\n\n',
      'We will be back in touch as soon as we can support adding you to the beta program.\n\n',
      'Please consider joining our Discord: {invite_url}',
    ),
  },

  welcome: {
    subject: 'Welcome to Composer!',
    content: str(
      "We're very happy to enroll you in the Composer Beta.\n\n",
      'Please visit the following access link to get started:\n\n',
      '{access_link}',
    ),
  },
};

/**
 * Every program attempts to expand until it can read mail.
 * Those programs which cannot so expand are replaced by ones which can.
 * [Zawinski's Law]
 *
 * Sending email requires TXT records to configure domain lockdown and SPF.
 * NOTE: MailChannels relay is restricted to CF prod workers (doesn't work in local dev server).
 *
 * https://developers.cloudflare.com/pages/functions/plugins/mailchannels
 * https://support.mailchannels.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Send-API
 * https://support.mailchannels.com/hc/en-us/articles/16918954360845-Secure-your-domain-name-against-spoofing-with-Domain-Lockdown
 */
export const sendEmail = async (user: User, message: MailRequest): Promise<void> => {
  log.info('sending', { email: user.email });

  const request = new Request('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: user.email }] }],
      from: { email: 'hello@dxos.org', name: 'DXOS' },
      subject: message.subject,
      content: [{ type: 'text/plain', value: message.content }],
    }),
  });

  const { status } = await fetch(request);
  if (status !== 200) {
    throw new HTTPException(502, { message: `Error sending email: ${user.email}` });
  }
};
