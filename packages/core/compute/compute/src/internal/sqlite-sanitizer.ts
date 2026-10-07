//
// Copyright 2026 DXOS.org
//

/**
 * Lexical SQL screen for `SqliteService`: a tokenizer plus keyword rules, not a parser.
 * It finds the names a statement reads or writes as tables so the caller can check ownership.
 */

/** Statement-leading keywords that act on the connection or the whole database rather than on tables. */
const FORBIDDEN_LEADING = new Set([
  'analyze',
  'attach',
  'begin',
  'commit',
  'detach',
  'end',
  'pragma',
  'reindex',
  'release',
  'rollback',
  'savepoint',
  'vacuum',
]);

/** Name prefixes of SQLite, Cloudflare and `SqliteService` internals. */
export const RESERVED_PREFIXES = ['sqlite_', 'pragma_', '_cf_', 'dx_sqlite_service'] as const;

/** Functions that escape the sandbox; matched wherever they appear. */
const FORBIDDEN_WORDS = new Set(['load_extension', 'readfile', 'writefile', 'fts3_tokenizer']);

/** Keywords after which the next name is a table (or other schema object). */
const TABLE_POSITION = new Set(['from', 'join', 'into', 'update', 'table', 'index', 'view', 'trigger', 'references']);

/** Keywords that end a FROM list, so a following comma no longer introduces a table. */
const CLAUSE_END = new Set([
  'where',
  'group',
  'order',
  'limit',
  'having',
  'window',
  'union',
  'intersect',
  'except',
  'on',
  'using',
  'returning',
  'set',
  'values',
  'select',
]);

/** Words that may sit between a table-position keyword and the name itself. */
const NAME_PREFIX_WORDS = new Set(['if', 'not', 'exists', 'or', 'rollback', 'abort', 'replace', 'fail', 'ignore']);

const OBJECT_KINDS = new Set(['table', 'index', 'view', 'trigger']);

type Token =
  | { readonly type: 'word'; readonly value: string; readonly raw: string }
  | { readonly type: 'ident'; readonly value: string }
  | { readonly type: 'punct'; readonly value: string };

export type Analysis = {
  /** Lowercased names that appear in a table position. */
  readonly tables: readonly string[];
  /** Object created by a CREATE statement. */
  readonly created?: string;
  /** Object removed by a DROP statement. */
  readonly dropped?: string;
  /** Table renamed by ALTER TABLE ... RENAME TO. */
  readonly renamed?: { readonly from: string; readonly to: string };
};

export type SanitizeResult =
  | { readonly ok: true; readonly analysis: Analysis }
  | { readonly ok: false; readonly reason: string };

const reject = (reason: string): SanitizeResult => ({ ok: false, reason });

const isWordStart = (char: string) => /[A-Za-z_]/.test(char);
const isWordChar = (char: string) => /[A-Za-z0-9_$]/.test(char);

/** Splits SQL into words, quoted identifiers and punctuation; string literals, numbers, comments and parameters are dropped. */
const tokenize = (sql: string): Token[] | string => {
  const tokens: Token[] = [];
  let index = 0;
  const readQuoted = (close: string): string | undefined => {
    let value = '';
    index++;
    while (index < sql.length) {
      const char = sql[index];
      if (char === close) {
        if (close !== ']' && sql[index + 1] === close) {
          value += close;
          index += 2;
          continue;
        }
        index++;
        return value;
      }
      value += char;
      index++;
    }
    return undefined;
  };

  while (index < sql.length) {
    const char = sql[index];
    if (/\s/.test(char)) {
      index++;
    } else if (char === '-' && sql[index + 1] === '-') {
      const end = sql.indexOf('\n', index);
      index = end === -1 ? sql.length : end + 1;
    } else if (char === '/' && sql[index + 1] === '*') {
      const end = sql.indexOf('*/', index + 2);
      if (end === -1) {
        return 'Unterminated comment.';
      }
      index = end + 2;
    } else if (char === "'") {
      if (readQuoted("'") === undefined) {
        return 'Unterminated string literal.';
      }
    } else if (char === '"' || char === '`' || char === '[') {
      const value = readQuoted(char === '[' ? ']' : char);
      if (value === undefined) {
        return 'Unterminated quoted identifier.';
      }
      tokens.push({ type: 'ident', value: value.toLowerCase() });
    } else if (char === '?' || char === ':' || char === '@' || char === '$') {
      index++;
      while (index < sql.length && isWordChar(sql[index])) {
        index++;
      }
    } else if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(sql[index + 1] ?? ''))) {
      index++;
      while (index < sql.length && /[0-9A-Za-z_.]/.test(sql[index])) {
        index++;
      }
    } else if (isWordStart(char)) {
      const start = index;
      while (index < sql.length && isWordChar(sql[index])) {
        index++;
      }
      const raw = sql.slice(start, index);
      // Blob literal X'..': the prefix is not a name.
      if ((raw === 'x' || raw === 'X') && sql[index] === "'") {
        if (readQuoted("'") === undefined) {
          return 'Unterminated blob literal.';
        }
        continue;
      }
      tokens.push({ type: 'word', value: raw.toLowerCase(), raw });
    } else {
      tokens.push({ type: 'punct', value: char });
      index++;
    }
  }

  return tokens;
};

const isName = (token: Token | undefined): token is Exclude<Token, { type: 'punct' }> =>
  token !== undefined && token.type !== 'punct';

/**
 * Screens a single SQL statement.
 * Rejects multiple statements, connection-level commands (PRAGMA, ATTACH, transactions, ...),
 * TEMP objects, extension loading and names with a reserved prefix; otherwise reports the names
 * used as tables for the caller's ownership check.
 */
export const sanitize = (sql: string): SanitizeResult => {
  const tokens = tokenize(sql);
  if (typeof tokens === 'string') {
    return reject(tokens);
  }

  // Trigger bodies contain `;` and BEGIN, so only a top-level `;` ends the statement.
  let blockDepth = 0;
  let end = tokens.length;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === 'word' && (token.value === 'begin' || token.value === 'case') && index > 0) {
      blockDepth++;
    } else if (token.type === 'word' && token.value === 'end' && blockDepth > 0) {
      blockDepth--;
    } else if (token.type === 'punct' && token.value === ';' && blockDepth === 0) {
      end = index;
      if (tokens.slice(index + 1).some((next) => !(next.type === 'punct' && next.value === ';'))) {
        return reject('Multiple statements are not allowed.');
      }
      break;
    }
  }
  const statement = tokens.slice(0, end);
  const leading = statement.find((token) => token.type === 'word');
  if (!leading) {
    return reject('Empty statement.');
  }
  if (FORBIDDEN_LEADING.has(leading.value)) {
    return reject(`${leading.raw.toUpperCase()} statements are not allowed.`);
  }

  for (const token of statement) {
    if (!isName(token)) {
      continue;
    }
    if (FORBIDDEN_WORDS.has(token.value)) {
      return reject(`Use of ${token.value} is not allowed.`);
    }
    if (RESERVED_PREFIXES.some((prefix) => token.value.startsWith(prefix))) {
      return reject(`Access to ${token.value} is not allowed.`);
    }
  }

  const words = statement.map((token) => (token.type === 'word' ? token.value : undefined));
  const isCreate = leading.value === 'create';
  if (isCreate && (words[1] === 'temp' || words[1] === 'temporary')) {
    return reject('TEMP objects are not allowed.');
  }

  const tables: string[] = [];
  let created: string | undefined;
  let dropped: string | undefined;
  let renamed: Analysis['renamed'];

  /** Reads `[schema.]name` at `index`; returns the name and the index after it. */
  const readName = (index: number): { name: string; next: number } | string | undefined => {
    const first = statement[index];
    if (!isName(first)) {
      return undefined;
    }
    const dot = statement[index + 1];
    if (dot?.type === 'punct' && dot.value === '.' && isName(statement[index + 2])) {
      if (first.value !== 'main') {
        return `Schema ${first.value} is not allowed.`;
      }
      return { name: statement[index + 2].value, next: index + 3 };
    }
    return { name: first.value, next: index + 1 };
  };

  // Paren depths at which a FROM list is open, so commas there introduce tables.
  const fromDepths = new Set<number>();
  let depth = 0;
  let pendingTable = false;
  let objectKind: string | undefined;
  // ON names a table only in CREATE INDEX / CREATE TRIGGER; elsewhere it starts a join condition.
  const onIsTable = isCreate && (words.includes('index') || words.includes('trigger'));

  for (let index = 0; index < statement.length; index++) {
    const token = statement[index];
    if (token.type === 'punct') {
      if (token.value === '(') {
        depth++;
        pendingTable = false;
      } else if (token.value === ')') {
        fromDepths.delete(depth);
        depth--;
        pendingTable = false;
      } else if (token.value === ',' && fromDepths.has(depth)) {
        pendingTable = true;
      }
      continue;
    }

    const word = token.type === 'word' ? token.value : undefined;
    if (pendingTable && word && (CLAUSE_END.has(word) || word === 'of' || word === 'do')) {
      // `DO UPDATE SET`, `UPDATE OF col ON t`: the keyword was not followed by a name.
      pendingTable = false;
    }
    if (pendingTable) {
      if (word && NAME_PREFIX_WORDS.has(word)) {
        continue;
      }
      const result = readName(index);
      if (typeof result === 'string') {
        return reject(result);
      }
      if (result) {
        tables.push(result.name);
        if (objectKind && isCreate && created === undefined) {
          created = result.name;
        } else if (objectKind && leading.value === 'drop' && dropped === undefined) {
          dropped = result.name;
        }
        objectKind = undefined;
        index = result.next - 1;
      }
      pendingTable = false;
      continue;
    }

    if (!word) {
      continue;
    }
    if (word === 'from') {
      fromDepths.add(depth);
    } else if (CLAUSE_END.has(word)) {
      fromDepths.delete(depth);
    }

    if (word === 'rename' && words[index + 1] === 'to') {
      const result = readName(index + 2);
      if (typeof result === 'string') {
        return reject(result);
      }
      if (result && tables[0] !== undefined) {
        renamed = { from: tables[0], to: result.name };
        tables.push(result.name);
        index = result.next - 1;
      }
      continue;
    }

    if (TABLE_POSITION.has(word) || (word === 'on' && onIsTable)) {
      // Inside a CREATE TABLE body REFERENCES and column names follow; the object kind is the first keyword.
      if (OBJECT_KINDS.has(word) && index <= 3) {
        objectKind = word;
      }
      pendingTable = true;
    }
  }

  return { ok: true, analysis: { tables: [...new Set(tables)], created, dropped, renamed } };
};
