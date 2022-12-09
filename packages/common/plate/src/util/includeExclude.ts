import minimatch from 'minimatch';

export const includeExclude = <T>(
  collection: T[],
  options?: { include?: (string | RegExp)[]; exclude?: (string | RegExp)[]; transform?: (element: T) => string }
): T[] => {
  const { include, exclude, transform } = { transform: (x: any) => x.toString(), ...options };
  const matches = (pattern: string | RegExp, value: string) =>
    pattern instanceof RegExp ? pattern.test(value) : minimatch(value, pattern);
  return collection.filter(
    (value) =>
      (include?.length ? include.some((pattern) => matches(pattern, transform(value))) : true) &&
      !(exclude ?? []).some((pattern) => matches(pattern, transform(value)))
  );
};
