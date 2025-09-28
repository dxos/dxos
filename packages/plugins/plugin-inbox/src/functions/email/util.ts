//
// Copyright 2025 DXOS.org
//

import TurndownService from 'turndown';

/**
 * https://www.npmjs.com/package/turndown
 */
export const turndown = new TurndownService({}).remove('style').remove('script');

// TODO(burdon): Replace legal disclaimers, etc.
export const stripNewlines = (str: string) => {
  const WHITESPACE = /[ \t\u00A0]*\n[ \t\u00A0]*\n[\s\u00A0]*/g;
  return str.trim().replace(WHITESPACE, '\n\n');
};

export const createUrl = (parts: (string | undefined)[], params: Record<string, any> = {}): URL => {
  const url = new URL(parts.filter(Boolean).join('/'));
  Object.entries(params)
    .filter(([_, value]) => value != null)
    .forEach(([key, value]) => url.searchParams.set(key, value));

  return url;
};

const EMAIL_REGEX = /^([^<]+?)\s*<([^>]+@[^>]+)>$/;

export const parseEmailString = (emailString: string): { name?: string; email: string } | undefined => {
  const match = emailString.match(EMAIL_REGEX);
  if (match) {
    const [, name, email] = match;
    return {
      name: name.trim(),
      email: email.trim(),
    };
  }

  return undefined;
};
