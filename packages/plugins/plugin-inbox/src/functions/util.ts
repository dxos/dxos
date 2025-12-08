//
// Copyright 2025 DXOS.org
//

import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

import { type GoogleMail } from './apis';

export const getPart = (message: GoogleMail.Message, part: string) =>
  message.payload.parts?.find(({ mimeType }) => mimeType === part)?.body.data;

/**
 * https://www.npmjs.com/package/turndown
 */
export const turndown = new TurndownService({
  bulletListMarker: '-',
})
  .remove('script')
  .remove('style')
  .addRule('cleanListSpacing', {
    filter: 'li',
    replacement: (content, node, options) => {
      content = content.replace(/\n{2,}/g, '\n').trim();
      const parent = node.parentNode;
      const isOrdered = parent && parent.nodeName === 'OL';
      if (isOrdered) {
        // Find the item index for ordered lists.
        const index = Array.prototype.indexOf.call(parent.children, node) + 1;
        return `${index}. ${content}\n`;
      } else {
        // Unordered list: single dash + single space.
        return `${options.bulletListMarker} ${content}\n`;
      }
    },
  });

export const isHTML = (str: string): boolean => {
  return /<(\/?(p|div|span|ul|ol|li|a|strong|em|br|table|tr|td|h[1-6]))\b[^>]*>/i.test(str);
};

export const toMarkdown = (html: string): string =>
  turndown.turndown(parseHTML(preprocessHtml(html), {}).document.body);

export const stripWhitespace = (str: string): string => {
  const WHITESPACE = /[ \t\u00A0]*\n[ \t\u00A0]*\n[\s\u00A0]*/g;
  return (
    str
      .trim()
      // Replace multiple newlines with double newlines.
      .replace(WHITESPACE, '\n\n')
      // Replace old-school sign-off dash with horizontal rule.
      .replace(/\\--/g, '---')
  );
};

// TODO(burdon): Replace legal disclaimers, etc.
export const normalizeText = (text: string): string => {
  const str = isHTML(text) ? stripWhitespace(toMarkdown(text)) : text;
  return str;
};

// TODO(burdon): Customizable parser for plaintext.
/*
  This meeting was scheduled from the bookings page of [NAME].\n\n
  Use the following link to reschedule or cancel this meeting:\n
  Manage meeting<https://outlook.office.com/bookwithme/user/XXXX@m12.vc/booking/u-xFoXD5TEqEgSFDBNfhFA2?anonymous>\n
  -----Note added from booking page on Wednesday, December 3, 2025 5:29 AM-----\n
  https://dxos.org https://docsend.com/view/ppdygbt8b95j4xy7\n\n
  __________________________________________________________________________________\n
  Microsoft Teams meeting\n
  Join: https://teams.microsoft.com/meet/26374053457629?p=rRYCKiwRDlgVqiKu4e\n
  Meeting ID: 263 740 534 576 29\n
  Passcode: Ax3Zj3Mx\n
  __________________________________\n
  Need help?<https://aka.ms/JoinTeamsMeeting?omkt=en-US> | System reference<https://teams.microsoft.com/l/meetup-join/19%3ameeting_NWQ4NDkxNGQtODRiNS00OWU5LTg0OTktNWNjYWU3NjA1ZGUx%40thread.v2/0?context=%7b%22Tid%22%3a%2272f988bf-86f1-41af-91ab-2d7cd011db47%22%2c%22Oid%22%3a%22ccfec372-66ee-43e2-9421-568cc4fff1e3%22%7d>\nDial in by phone\n+1 323-849-4874,,766918553#<tel:+13238494874,,766918553#> United States, Los Angeles\nFind a local number<https://dialin.teams.microsoft.com/8551f4c1-bea3-441a-8738-69aa517a91c5?id=766918553>\nPhone conference ID: 766 918 553#\nFor organizers: Meeting options<https://teams.microsoft.com/meetingOptions/?organizerId=ccfec372-66ee-43e2-9421-568cc4fff1e3&tenantId=72f988bf-86f1-41af-91ab-2d7cd011db47&threadId=19_meeting_NWQ4NDkxNGQtODRiNS00OWU5LTg0OTktNWNjYWU3NjA1ZGUx@thread.v2&messageId=0&language=en-US> | Reset dial-in PIN<https://dialin.teams.microsoft.com/usp/pstnconferencing>\n
  ________________________________________________________________________________\n
*/

/**
 * Parses an email string in the format "Name <email@example.com>" into separate name and email components.
 */
export const parseFromHeader = (value: string): { name?: string; email: string } | undefined => {
  const EMAIL_REGEX = /^([^<]+?)\s*<([^>]+@[^>]+)>$/;
  const removeOuterQuotes = (str: string) => str.replace(/^['"]|['"]$/g, '');
  const match = value.match(EMAIL_REGEX);
  if (match) {
    const [, name, email] = match;
    return {
      name: removeOuterQuotes(name.trim()),
      email: email.trim(),
    };
  }
};

const preprocessHtml = (html: string): string => {
  // Ensure HTML has proper structure for linkedom parsing.
  // If the HTML is a fragment without html/body tags, wrap it.
  const wrappedHtml = html.trim().startsWith('<html') ? html : `<html><body>${html}</body></html>`;
  return wrappedHtml;
};
