import minimatch from 'minimatch';

export const includeExclude = (
  collection: string[],
  options?: { include?: (string | RegExp)[]; exclude?: (string | RegExp)[] }
): string[] => {
  const { include, exclude } = { ...options };
  const matches = (pattern: string | RegExp, value: string) =>
    pattern instanceof RegExp ? pattern.test(value) : minimatch(value, pattern);
  return collection.filter(
    (value) =>
      (include?.length ? include.some((pattern) => matches(pattern, value)) : true) &&
      !(exclude ?? []).some((pattern) => matches(pattern, value))
  );
};
