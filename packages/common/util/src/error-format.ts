/**
 * Formats an error with its cause chain.
 */
export const formatErrorWithCauses = (error: Error): string => {
  const lines: string[] = [];
  let current: Error | undefined = error;
  let level = 0;

  while (current) {
    const prefix = level === 0 ? '' : `Caused by: `;
    lines.push(prefix + (current.stack ?? String(current)));
    if (!(current.cause instanceof Error)) break;
    current = current.cause;
    level += 1;
  }

  return lines.join('\n\n');
};
