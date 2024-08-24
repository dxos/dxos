export const createValue = (source: string) => new Uint8Array(textEncoder.encode(source));

const textEncoder = new TextEncoder();

export const randomKey = () => crypto.randomUUID();
