//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ContentBlock, Message } from '@dxos/types';

import { extractContactFromMessage } from './extract-contact';

const makeEmailMessage = ({
  senderName,
  senderEmail,
  body,
  subject,
}: {
  senderName: string;
  senderEmail: string;
  body: string;
  subject?: string;
}): Message.Message =>
  Message.make({
    sender: { name: senderName, email: senderEmail },
    blocks: [{ _tag: 'text', text: body } satisfies ContentBlock.Text],
    properties: subject ? { subject } : undefined,
  });

describe('extractContactFromMessage', () => {
  test('email #1 — Madeline Ahern (corporate)', ({ expect }) => {
    const msg = makeEmailMessage({
      senderName: 'Madeline Ahern',
      senderEmail: 'mahern@kirkconsult.com',
      subject: 'EOR update',
      body: [
        'Hi Rich,',
        'As an fyi - the switch to EOR for Mykola is still in process.  Deel is waiting on some visa questions from Mykola.',
        '',
        'Thanks,',
        'Madeline',
        '',
        'Madeline Ahern',
        'mahern@kirkconsult.com',
        '(510) 393-7703',
      ].join('\n'),
    });

    const extract = extractContactFromMessage(msg);

    expect(extract.fullName).toBe('Madeline Ahern');
    expect(extract.email).toBe('mahern@kirkconsult.com');
    expect(extract.phone).toBe('(510) 393-7703');
    expect(extract.orgDomain).toBe('kirkconsult.com');
    expect(extract.isFreeMailDomain).toBe(false);
    // Pragmatic: orgName is a best-effort fallback when no better source exists.
    expect(extract.orgName).toBeDefined();
  });

  test('email #2 — David Joerg (free-mail)', ({ expect }) => {
    const msg = makeEmailMessage({
      senderName: 'David Joerg',
      senderEmail: 'dsjoerg@gmail.com',
      body: [
        "Rich!  So nice to hear from you.  I'd love to get together.",
        "I'm no longer affiliated with Two Sigma or Two Sigma Ventures,",
        'and no longer doing angel investing,',
        'and out of the loop on what\'s really happening in AI land,',
        "but it'd be great to get together.",
        '',
        'I recently moved to the Upper East Side (boo)',
        'but to a great place, great for a hang.',
        '',
        'Where are you these days?',
      ].join('\n'),
    });

    const extract = extractContactFromMessage(msg);

    expect(extract.fullName).toBe('David Joerg');
    expect(extract.email).toBe('dsjoerg@gmail.com');
    expect(extract.orgDomain).toBe('gmail.com');
    expect(extract.isFreeMailDomain).toBe(true);
    // Free-mail domain must not yield an organization name.
    expect(extract.orgName).toBeUndefined();
  });

  test('email #3 — Michael Ng (rich signature)', ({ expect }) => {
    const msg = makeEmailMessage({
      senderName: 'Michael Ng',
      senderEmail: 'Michael.Ng@kobrekim.com',
      body: [
        'Francesco,',
        '',
        'I was just talking to Rich about his dispute and wonder if the three of us can put our heads together tomorrow.  Would 9:30am work?  I\'ll send a calendar invite but just let me know if you need to move it.',
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
      ].join('\n'),
    });

    const extract = extractContactFromMessage(msg);

    expect(extract.fullName).toBe('Michael Ng');
    expect(extract.email).toBe('Michael.Ng@kobrekim.com');
    expect(extract.phone).toBe('+1 415 582 4803');
    expect(extract.orgDomain).toBe('kobrekim.com');
    expect(extract.isFreeMailDomain).toBe(false);

    expect(extract.urls).toBeDefined();
    expect(extract.urls!).toContain('www.kobrekim.com');

    expect(extract.locations).toBeDefined();
    expect(extract.locations!).toContain('New York');
    expect(extract.locations!).toContain('San Francisco');
    expect(extract.locations!).toContain('London');
  });
});
