//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

export type ParseResult = {
  pre?: string;
  post?: string;
  type: string;
  content: string;
  data?: any;
};

export const parseMessage = (content: string, type = '\\w+'): ParseResult | undefined => {
  invariant(content);
  const text = content.replace(/[\n\r]/g, ' ');

  // Check if entire message is JSON.
  if (type === 'json') {
    const data = parseJson(content);
    if (data) {
      return {
        type,
        content,
        data,
      };
    }
  }

  // Check for embedded block content.
  const regexp = new RegExp('(.+)?```(' + type + ')(.+)```');
  const match = regexp.exec(text);
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
