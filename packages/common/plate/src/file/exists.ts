import path from "path";
import { promises as fs } from "fs";

//TODO: factor out to own fs package like @dxos/fs
export const exists = async (...args: string[]): Promise<boolean> => {
  try {
    const result = await fs.stat(path.join(...args));
    return !!result;
  } catch (err: any) {
    if (/ENOENT/.test(err.message)) {
      return false;
    } else {
      throw err;
    }
  }
};