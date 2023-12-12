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

  // Check for embedded block content.
  const regexp1 = new RegExp('(.+)?```(' + type + ')?\\s+(.+)```', 's');
  const match = regexp1.exec(content);
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
