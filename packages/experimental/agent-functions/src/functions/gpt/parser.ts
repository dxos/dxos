//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { safeParseJson } from '@dxos/util';

export type ParseResult = {
  timestamp: string;
  type: string;
  kind?: 'fenced';
  pre?: string;
  post?: string;
  content: string;
  data?: any;
};

export const parseMessage = (content: object | string, type?: string): ParseResult => {
  invariant(content);
  const timestamp = new Date().toISOString();

  // TODO(burdon): Reconcile with JsonOutputFunctionsParser.
  if (typeof content === 'object') {
    return {
      timestamp,
      type: 'json',
      content: JSON.stringify(content),
      data: content,
    };
  }

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
