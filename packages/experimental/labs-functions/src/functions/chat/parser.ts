//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type ParseResult = {
  timestamp: string;
  type: string;
  kind?: 'fenced'; // TODO(burdon): ???
  pre?: string;
  post?: string;
  content: string;
  data?: any;
};

export const parseMessage = (content: string, type?: string): ParseResult => {
  invariant(content);
  const timestamp = new Date().toISOString();

  // Check if raw JSON.
  if (!type || type === 'json') {
    const value = parseJson(content);
    if (value) {
      return {
        timestamp,
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
      timestamp,
      type,
      pre,
      post,
      content,
      data: type === 'json' ? parseJson(content) : undefined,
      kind: 'fenced',
    };
  }

  return {
    timestamp,
    type: 'text',
    content,
  };
};

export const parseJson = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
};
