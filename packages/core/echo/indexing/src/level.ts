import { PublicKey } from '@dxos/keys';
import { AbstractSublevel } from 'abstract-level';
import { Level } from 'level';

export type MyLevel = Level<string, string>;
export type MySublevel = AbstractSublevel<MyLevel, string | Buffer | Uint8Array, string, string>;

export async function createTestLevel(): Promise<MyLevel> {
  const level = new Level<string, string>(`/tmp/dxos-${PublicKey.random().toHex()}`);
  await level.open();
  return level;
}
