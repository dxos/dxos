//
// Copyright 2023 DXOS.org
//

export const randomArraySlice = <T>(array: T[], size: number) => {
  const result = [];
  const arrayCopy = [...array];
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * arrayCopy.length);
    result.push(arrayCopy[randomIndex]);
    arrayCopy.splice(randomIndex, 1);
  }
  return result;
};

/** An error as the artifact should record it: message, cause chain, and the top of the stack. */
export const describeError = (err: unknown): string => {
  if (!(err instanceof Error)) {
    return String(err);
  }
  const causes: string[] = [];
  for (let cause = err.cause; cause instanceof Error && causes.length < 4; cause = cause.cause) {
    causes.push(cause.message);
  }
  // Four frames: enough to name the call that threw without turning the summary table into a dump.
  const frames = (err.stack ?? '')
    .split('\n')
    .slice(1, 5)
    .map((line) => line.trim());
  return [err.message, ...causes.map((cause) => `caused by: ${cause}`), ...frames].join(' | ');
};
