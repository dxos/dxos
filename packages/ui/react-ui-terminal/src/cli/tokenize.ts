//
// Copyright 2026 DXOS.org
//

/**
 * Splits a raw input line into argv tokens. Supports single/double-quoted segments so quoted
 * strings with spaces survive. Intentionally simple — anything needing real shell semantics belongs
 * in a real shell.
 */
export const tokenize = (input: string): string[] => {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }

  return tokens;
};

/**
 * Translates shell-friendly aliases to their Effect CLI equivalents. The Effect CLI uses `--help`
 * rather than a `help` subcommand, but `help` and `?` are the natural things to type.
 */
export const rewriteHelpAliases = (tokens: ReadonlyArray<string>): string[] => {
  if (tokens.length === 0) {
    return [...tokens];
  }

  if (tokens[0] !== 'help' && tokens[0] !== '?') {
    return [...tokens];
  }

  return tokens.length === 1 ? ['--help'] : [...tokens.slice(1), '--help'];
};
