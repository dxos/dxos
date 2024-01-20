//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { safeParseJson } from '../../util';

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
    const value = safeParseJson(content);
    if (value) {
      return {
        timestamp,
        type: 'json',
        content,
        data: value,
      };
    }
  }

  // Check for fenced content.
  const regexp = new RegExp('(.+)?```\\s*(' + (type ?? '\\w+') + ')?\\s+(.+)```', 's');
  const match = regexp.exec(content);
  if (match) {
    const [_, pre, type, content, post] = match;
    return {
      timestamp,
      type,
      pre,
      post,
      content,
      data: type === 'json' ? safeParseJson(content) : undefined,
      kind: 'fenced',
    };
  }

  return {
    timestamp,
    type: 'text',
    content,
  };
};
