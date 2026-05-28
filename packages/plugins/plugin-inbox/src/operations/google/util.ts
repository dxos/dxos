//
// Copyright 2025 DXOS.org
//

import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

/**
 * https://www.npmjs.com/package/turndown
 */
const turndown = new TurndownService({
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

const isHTML = (str: string): boolean => {
  return /<(\/?(p|div|span|ul|ol|li|a|strong|em|br|table|tr|td|h[1-6]))\b[^>]*>/i.test(str);
};

const preprocessHtml = (html: string): string => {
  // Ensure HTML has proper structure for linkedom parsing.
  // If the HTML is a fragment without html/body tags, wrap it.
  const wrappedHtml = html.trim().startsWith('<html') ? html : `<html><body>${html}</body></html>`;
  return wrappedHtml;
};

const toMarkdown = (html: string): string => turndown.turndown(parseHTML(preprocessHtml(html), {}).document.body);

/**
 * Strip residual HTML/XML tags that survive turndown conversion (e.g., MS Office namespaced
 * tags like <o:p>, <v:shape>, conditional comments, stray <span style=...>).
 *
 * Namespaced tags and MS conditional comments are stripped unconditionally — they have no
 * meaning in genuine plaintext bodies. The generic inline-tag pass (<span>, <font>, <u>,
 * <div>) is opt-in via `fromHtml` so we don't eat literal angle-bracketed text in plaintext
 * messages.
 */
const stripResidualTags = (str: string, { fromHtml = false }: { fromHtml?: boolean } = {}): string => {
  const cleaned = str
    // 1. Conditional comments: <!--[if mso]>...<![endif]-->.
    .replace(/<!--\s*\[if[^\]]*\][\s\S]*?<!\[endif\]\s*-->/gi, '')
    // 2. Namespaced tags (<o:p>, <v:shape>, <w:WordDocument/>, <m:mathPr>, etc.).
    .replace(/<\/?[a-zA-Z][\w-]*:[^>]*>/g, '');

  // 3. Stray known-bad inline tags that survive turndown in edge cases — HTML pipeline only.
  return fromHtml ? cleaned.replace(/<\/?(span|font|u|div)\b[^>]*>/gi, '') : cleaned;
};

const stripWhitespace = (str: string): string => {
  // Invisible/whitespace characters that newsletters use to pad preview text:
  // soft hyphen (U+00AD), combining grapheme joiner (U+034F), zero-width
  // space/non-joiner/joiner (U+200B-U+200D), word joiner (U+2060), and BOM/
  // ZWNBSP (U+FEFF), plus regular space, tab, and NBSP.
  const INVISIBLE = ' \\t\\u00A0\\u00AD\\u034F\\u200B-\\u200D\\u2060\\uFEFF';
  const WHITESPACE = /[ \t\u00A0]*\n[ \t\u00A0]*\n[\s\u00A0]*/g;
  return (
    str
      .trim()
      // Blank out lines that contain only invisible/whitespace characters (newsletter padding).
      .replace(new RegExp(`^[${INVISIBLE}]+$`, 'gm'), '')
      // Convert setext-underline / horizontal-rule lines (3+ `=` or `-`) to a markdown HR.
      .replace(/^[ \t\u00A0]*[=-]{3,}[ \t\u00A0]*$/gm, '---')
      // Replace old-school sign-off dash with horizontal rule.
      .replace(/\\--/g, '---')
      // Blank out lines that contain no word character (e.g., junk separators like `*****`,
      // `,,,,`). Empty lines are preserved as paragraph breaks; the `---` HR we just inserted
      // is exempted so it survives.
      .replace(/^(?!---$)[^\w\n]*$/gm, '')
      // Replace multiple newlines with double newlines.
      .replace(WHITESPACE, '\n\n')
      // Trim trailing whitespace from every line.
      .replace(/[ \t\u00A0]+$/gm, '')
  );
};

// TODO(burdon): Replace legal disclaimers, etc.
export const normalizeText = (text: string): string => {
  // Collapse runs of blank lines for both HTML (after markdown conversion) and
  // plain-text emails so the rendered message never shows more than one blank
  // line between paragraphs.
  const fromHtml = isHTML(text);
  const converted = fromHtml ? toMarkdown(text) : text;
  return stripWhitespace(stripResidualTags(converted, { fromHtml }));
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
