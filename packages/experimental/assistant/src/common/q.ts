/**
 * Trims multiline strings.
 */
export const trim = (strings: TemplateStringsArray, ...values: any[]) => {
  const combined = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] || '');
  }, '');

  return combined.replace(`/^\n/`, '').replace(/\n$/, '');
};
