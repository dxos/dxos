//
// Copyright 2026 DXOS.org
//

import { ContentBlock, Message } from '@dxos/types';

/**
 * Shared email fixtures used by both the extractor unit tests and the CRM
 * blueprint playground. Keeping them in one module prevents drift between
 * test layers as we tune behaviour.
 *
 * All names, emails, phone numbers, and corporate domains are synthetic.
 * Domains use the reserved `.example` TLD (RFC 2606) and phone numbers use
 * the 555-01xx range (NANP reserved for fiction). The only real domain is
 * `gmail.com`, which is required so the free-mail-domain heuristic test has
 * something real to match.
 */

export type EmailFixture = {
  id: 'corporate-short' | 'freemail-personal' | 'corporate-rich-signature';
  label: string;
  senderName: string;
  senderEmail: string;
  subject?: string;
  body: string;
};

const body = (lines: string[]): string => lines.join('\n');

export const EMAIL_FIXTURES: readonly EmailFixture[] = [
  {
    id: 'corporate-short',
    label: 'Corporate contact (short signature)',
    senderName: 'Priya Adebayo',
    senderEmail: 'padebayo@ventura-advisors.example',
    subject: 'Onboarding update',
    body: body([
      'Hi Sam,',
      'Quick note — the contractor paperwork for the new engineer is still in process. Their provider is waiting on visa documents.',
      '',
      'Thanks,',
      'Priya',
      '',
      'Priya Adebayo',
      'padebayo@ventura-advisors.example',
      '(555) 010-0149',
    ]),
  },
  {
    id: 'freemail-personal',
    label: 'Personal contact (free-mail, no corporate signature)',
    senderName: 'Riley Nakamura',
    senderEmail: 'riley.nakamura@gmail.com',
    body: body([
      "Sam!  So nice to hear from you.  I'd love to get together.",
      'I stepped away from my old firm a while back and am not active in angel investing anymore,',
      "and pretty out of the loop on what's happening in AI land,",
      "but it'd be great to catch up in person.",
      '',
      'I recently moved across town — happy to host if you fancy a hang.',
      '',
      'Where are you these days?',
    ]),
  },
  {
    id: 'corporate-rich-signature',
    label: 'Corporate contact (rich multi-office signature)',
    senderName: 'Saskia Volkov',
    senderEmail: 'Saskia.Volkov@silverline-partners.example',
    body: body([
      'Francesco,',
      '',
      "Jumping off a call about the dispute — can the three of us sync tomorrow?  Would 9:30am work?  I'll send a calendar invite but just let me know if you need to move it.",
      '',
      'Saskia',
      '',
      'Saskia Volkov',
      '+1 555 010 4182',
      '',
      'www.silverline-partners.example',
      '',
      'Americas (New York, Buenos Aires, Chicago, Miami, San Francisco, São Paulo, Washington DC)',
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
