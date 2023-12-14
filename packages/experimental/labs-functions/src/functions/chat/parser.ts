//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type ParseResult = {
  pre?: string;
  post?: string;
  type: string;
  content: string;
  data?: any;
};

export const parseMessage = (content: string, type?: string): ParseResult | undefined => {
  invariant(content);

  // Check if raw JSON.
  if (!type || type === 'json') {
    const value = parseJson(content);
    if (value) {
      return {
        type: 'json',
        content: value,
        data: value,
      };
    }
  }

  // Check for embedded block content.
  const regexp = new RegExp('(.+)?```\\s*(' + (type ?? '\\w+') + ')?\\s+(.+)```', 's');
  const match = regexp.exec(content);
  log.info('match', { match });
  if (match) {
    const [_, pre, type, content, post] = match;
    return {
      pre,
      post,
      type,
      content,
      data: type === 'json' ? parseJson(content) : undefined,
    };
  }
};

export const parseJson = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
};
