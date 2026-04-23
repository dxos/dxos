//
// Copyright 2026 DXOS.org
//

import { ContentBlock, Message } from '@dxos/types';

/**
 * Shared email fixtures used by both the extractor unit tests and the CRM
 * blueprint playground. Keeping them in one module prevents drift between
 * test layers as we tune behaviour.
 */

export type EmailFixture = {
  id: 'madeline-ahern' | 'david-joerg' | 'michael-ng';
  label: string;
  senderName: string;
  senderEmail: string;
  subject?: string;
  body: string;
};

const body = (lines: string[]): string => lines.join('\n');

export const EMAIL_FIXTURES: readonly EmailFixture[] = [
  {
    id: 'madeline-ahern',
    label: 'Madeline Ahern (corporate)',
    senderName: 'Madeline Ahern',
    senderEmail: 'mahern@kirkconsult.com',
    subject: 'EOR update',
    body: body([
      'Hi Rich,',
      'As an fyi - the switch to EOR for Mykola is still in process.  Deel is waiting on some visa questions from Mykola.',
      '',
      'Thanks,',
      'Madeline',
      '',
      'Madeline Ahern',
      'mahern@kirkconsult.com',
      '(510) 393-7703',
    ]),
  },
  {
    id: 'david-joerg',
    label: 'David Joerg (free-mail)',
    senderName: 'David Joerg',
    senderEmail: 'dsjoerg@gmail.com',
    body: body([
      "Rich!  So nice to hear from you.  I'd love to get together.",
      "I'm no longer affiliated with Two Sigma or Two Sigma Ventures,",
      'and no longer doing angel investing,',
      "and out of the loop on what's really happening in AI land,",
      "but it'd be great to get together.",
      '',
      'I recently moved to the Upper East Side (boo)',
      'but to a great place, great for a hang.',
      '',
      'Where are you these days?',
    ]),
  },
  {
    id: 'michael-ng',
    label: 'Michael Ng (rich signature)',
    senderName: 'Michael Ng',
    senderEmail: 'Michael.Ng@kobrekim.com',
    body: body([
      'Francesco,',
      '',
      "I was just talking to Rich about his dispute and wonder if the three of us can put our heads together tomorrow.  Would 9:30am work?  I'll send a calendar invite but just let me know if you need to move it.",
      '',
      'Mike',
      '',
      'Michael Ng',
      '+1 415 582 4803',
      '',
      'www.kobrekim.com',
      '',
      'Americas (New York, Buenos Aires, Chicago, Delaware, Miami, San Francisco, São Paulo, Washington DC)',
      'Asia-Pacific (Hong Kong, Seoul, Shanghai), EMEA (London, Tel Aviv), Offshore (BVI, Cayman Islands)',
    ]),
  },
];

export const makeEmailMessage = (fixture: EmailFixture): Message.Message =>
  Message.make({
    sender: { name: fixture.senderName, email: fixture.senderEmail },
    blocks: [{ _tag: 'text', text: fixture.body } satisfies ContentBlock.Text],
    properties: fixture.subject ? { subject: fixture.subject } : undefined,
  });
