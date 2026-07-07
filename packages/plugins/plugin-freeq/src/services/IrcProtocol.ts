//
// Copyright 2026 DXOS.org
//

export interface IrcMessage {
  tags: Record<string, string>;
  prefix?: string;
  command: string;
  params: string[];
}

const unescapeTagValue = (value: string): string =>
  value.replace(/\\(.)/g, (_, ch) => {
    switch (ch) {
      case ':':
        return ';';
      case 's':
        return ' ';
      case 'r':
        return '\r';
      case 'n':
        return '\n';
      case '\\':
        return '\\';
      default:
        return ch;
    }
  });

const escapeTagValue = (value: string): string =>
  value.replace(/[;\s\r\n\\]/g, (ch) => {
    switch (ch) {
      case ';':
        return '\\:';
      case ' ':
        return '\\s';
      case '\r':
        return '\\r';
      case '\n':
        return '\\n';
      default:
        return '\\\\';
    }
  });

// A trailing param needs `:` when empty, containing a space, or starting with `:`.
const needsTrailing = (param: string): boolean => param.length === 0 || param.includes(' ') || param.startsWith(':');

const parse = (line: string): IrcMessage => {
  let rest = line;
  const tags: Record<string, string> = {};
  if (rest.startsWith('@')) {
    const end = rest.indexOf(' ');
    if (end === -1) {
      // No content follows the tags segment (malformed/truncated line); there is no
      // command or params to extract, so stop here rather than slicing with -1.
      const tagStr = rest.slice(1);
      for (const pair of tagStr.split(';')) {
        const eq = pair.indexOf('=');
        if (eq === -1) {
          tags[pair] = '';
        } else {
          tags[pair.slice(0, eq)] = unescapeTagValue(pair.slice(eq + 1));
        }
      }
      return { tags, prefix: undefined, command: '', params: [] };
    }
    const tagStr = rest.slice(1, end);
    rest = rest.slice(end + 1).trimStart();
    for (const pair of tagStr.split(';')) {
      const eq = pair.indexOf('=');
      if (eq === -1) {
        tags[pair] = '';
      } else {
        tags[pair.slice(0, eq)] = unescapeTagValue(pair.slice(eq + 1));
      }
    }
  }

  let prefix: string | undefined;
  if (rest.startsWith(':')) {
    const end = rest.indexOf(' ');
    if (end === -1) {
      // Lone prefix with nothing following (malformed/truncated line): the whole
      // remainder is the prefix and there is no command or params.
      prefix = rest.slice(1);
      return { tags, prefix, command: '', params: [] };
    }
    prefix = rest.slice(1, end);
    rest = rest.slice(end + 1).trimStart();
  }

  const params: string[] = [];
  while (rest.length > 0) {
    if (rest.startsWith(':')) {
      params.push(rest.slice(1));
      break;
    }
    const sp = rest.indexOf(' ');
    if (sp === -1) {
      params.push(rest);
      break;
    }
    params.push(rest.slice(0, sp));
    rest = rest.slice(sp + 1).trimStart();
  }

  const command = params.shift() ?? '';
  return { tags, prefix, command, params };
};

const serialize = (message: Omit<IrcMessage, 'tags'> & { tags?: Record<string, string> }): string => {
  const parts: string[] = [];
  const tagEntries = Object.entries(message.tags ?? {});
  if (tagEntries.length > 0) {
    parts.push(
      '@' + tagEntries.map(([key, value]) => (value === '' ? key : `${key}=${escapeTagValue(value)}`)).join(';'),
    );
  }
  if (message.prefix) {
    parts.push(':' + message.prefix);
  }
  parts.push(message.command);
  message.params.forEach((param, index) => {
    const isLast = index === message.params.length - 1;
    const hasMultipleParams = message.params.length > 1;
    parts.push(isLast && (needsTrailing(param) || hasMultipleParams) ? ':' + param : param);
  });
  return parts.join(' ');
};

export const IrcProtocol = {
  parse,
  serialize,
};
