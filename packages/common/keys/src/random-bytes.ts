export const randomBytes = (length: number) => {
  // globalThis.crypto is not available in Node.js when running in vitest even though the documentation says it should be.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const webCrypto = globalThis.crypto ?? require('node:crypto').webcrypto;

  const bytes = new Uint8Array(length);
  webCrypto.getRandomValues(bytes);
  return bytes;
};
