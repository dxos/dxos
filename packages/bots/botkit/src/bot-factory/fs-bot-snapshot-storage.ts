//
// Copyright 2022 DXOS.org
//

import fs from 'fs';
import { join } from 'path';

import { Bot } from '@dxos/protocols/proto/dxos/bot';

export type BotToRestore = {
  bot: Bot
  localPath: string
}

export interface BotSnapshotStorage {
  /**
   * Exports the bot to a specific storage type.
   * @param bot
   * @param localPath
   */
  backupBot (bot: Bot, localPath: string | undefined): Promise<void>
  /**
   * Imports a bot from a specific storage type.
   * @param id
   */
  restoreBot (id: string): Promise<BotToRestore>
  /**
   * Fetches a list of all available bots.
   */
  listBackupedBot (): Promise<string[]>
  /**
   * Deletes a bot from the storage.
   */
  deleteBackupedBot (id: string): Promise<void>
  /**
   * Deletes all bots from the storage.
   */
  reset (): Promise<void>
}

export class FSBotSnapshotStorage implements BotSnapshotStorage {
  constructor (
    private readonly _dir: string
  ) {}

  async backupBot (bot: Bot, localPath: string | undefined): Promise<void> {
    if (localPath) {
      const botStorage = join(this._dir, bot.id!);
      await fs.promises.mkdir(this._dir, { recursive: true });
      // TODO(egorgripasov): Encode in protobuf.
      const dataToExport = JSON.stringify({ bot, localPath });
      await fs.promises.writeFile(botStorage, dataToExport);
    }
  }

  async restoreBot (id: string): Promise<BotToRestore> {
    const botStorage = join(this._dir, id);
    const data = await fs.promises.readFile(botStorage);
    // TODO(egorgripasov): Encode from protobuf.
    const dataToRestore = JSON.parse(data.toString()) as BotToRestore;
    return dataToRestore;
  }

  async listBackupedBot (): Promise<string[]> {
    if (fs.existsSync(this._dir)) {
      const files = await fs.promises.readdir(this._dir);
      return files;
    }
    return [];
  }

  async deleteBackupedBot (id: string): Promise<void> {
    const botStorage = join(this._dir, id);
    if (fs.existsSync(botStorage)) {
      await fs.promises.unlink(botStorage);
    }
  }

  async reset (): Promise<void> {
    if (fs.existsSync(this._dir)) {
      await fs.promises.rmdir(this._dir, { recursive: true });
    }
  }
}
