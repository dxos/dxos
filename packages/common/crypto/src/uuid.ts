import { webcrypto } from './subtle';

export const randomUUID = (): string => {
  return webcrypto.randomUUID();
};
