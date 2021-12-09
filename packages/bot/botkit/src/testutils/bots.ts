import { createId } from "@dxos/crypto";
import { join } from "path";
import { BotHandle } from "..";

export const BOTS_PATH = join(__dirname, '../../bots');

export const createHandle = () => {
  const id = createId();
  return new BotHandle(id, join(BOTS_PATH, id));
}