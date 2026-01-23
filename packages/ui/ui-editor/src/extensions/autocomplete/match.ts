//
// Copyright 2025 DXOS.org
//

export type CompoetionContext = { line: string };

export type CompletionOptions = {
  default?: string;
  minLength?: number;
};

/**
 * Util to match current line to a static list of completions.
 */
export const staticCompletion =
  (completions: string[], options: CompletionOptions = {}) =>
  ({ line }: CompoetionContext) => {
    if (line.length === 0 && options.default) {
      return options.default;
    }

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length) {
      const str = parts.at(-1)!;
      if (str.length >= (options.minLength ?? 0)) {
        for (const completion of completions) {
          const match = matchCompletion(completion, str);
          if (match) {
            return match;
          }
        }
      }
    }
  };

export const matchCompletion = (completion: string, str: string, minLength = 0): string | undefined => {
  if (
    str.length >= minLength &&
    completion.length > str.length &&
    completion.startsWith(str)
    // TODO(burdon): If case insensitive, need to replace existing chars.
    // completion.toLowerCase().startsWith(str.toLowerCase())
  ) {
    return completion.slice(str.length);
  }
};
