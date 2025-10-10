//
// Copyright 2025 DXOS.org
//

import TurndownService from 'turndown';

import { type MessageDetails } from './types';

export const getPart = (message: MessageDetails, part: string) =>
  message.payload.parts?.find(({ mimeType }) => mimeType === part)?.body.data;

/**
 * https://www.npmjs.com/package/turndown
 */
export const turndown = new TurndownService({}).remove('script').remove('style');

// TODO(burdon): Replace legal disclaimers, etc.
export const stripNewlines = (str: string) => {
  const WHITESPACE = /[ \t\u00A0]*\n[ \t\u00A0]*\n[\s\u00A0]*/g;
  return str.trim().replace(WHITESPACE, '\n\n');
};

// TODO(burdon): Reconcile with @dxos/util.
export const createUrl = (parts: (string | undefined)[], params: Record<string, any> = {}): URL => {
  const url = new URL(parts.filter(Boolean).join('/'));
  Object.entries(params)
    .filter(([_, value]) => value != null)
    .forEach(([key, value]) => url.searchParams.set(key, value));

  return url;
};

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
