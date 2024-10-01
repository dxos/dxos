export const createValue = (source: string) => new Uint8Array(textEncoder.encode(source));

const textEncoder = new TextEncoder();

export const randomKey = () => crypto.randomUUID();

export const randomSample = <T>(data: T[], count: number) => data.toSorted(() => Math.random() - 0.5).slice(0, count);
