//
// Copyright 2023 DXOS.org
//

export type ParseResult = {
  pre: string;
  post: string;
  type: string;
  content: string;
  data?: any;
};

export const parseMessage = (content: string): ParseResult | undefined => {
  const text = content.replace(/\n/, '');
  const match = text.match(/(.+)?```(\w+) (.+)```(.+)/);
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

const parseJson = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
};
