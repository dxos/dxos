//
// Copyright 2024 DXOS.org
//

import * as EmailValidator from 'email-validator';
import { HTTPException } from 'hono/http-exception';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { nonNullable } from '@dxos/util';

import { str } from './util';

// TODO(burdon): Zod schema.
// TODO(burdon): Validate email.

enum Status {
  AUTHORIZED = 'A',
  WAITING = 'W',
  ERROR = 'E',
}

export type User = {
  id: number;
  identityKey?: string | null;
  accessToken?: string | null;
  created: Date;
  email: string;
  status: string; // TODO(burdon): Enum.
};

const mapRecord = ({ UserId, IdentityKey, AccessToken, Created, Status, Email }: Record<string, unknown>) =>
  ({
    id: UserId as number,
    identityKey: IdentityKey as string | null,
    accessToken: AccessToken as string | null,
    created: new Date(Created as number),
    email: Email as string,
    status: Status as string,
  }) satisfies User;

// TODO(burdon): Backup database (admin tool/scheduled?)
// TODO(burdon): Query JSON: https://developers.cloudflare.com/d1/build-with-d1/query-json

// https://developers.cloudflare.com/d1/build-with-d1/d1-client-api

/**
 *
 */
export class UserManager {
  constructor(private db: D1Database) {}

  async getUsers(): Promise<User[]> {
    const { results } = await this.db.prepare('SELECT * FROM Users').all();
    return results.map(mapRecord);
  }

  async getUsersByDate(n = 10): Promise<User[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM Users WHERE Status = ? ORDER BY Created')
      .bind(Status.WAITING)
      .all();
    return results.map(mapRecord);
  }

  async getUsersById(userIds: number[]): Promise<User[]> {
    const { results } = await this.db
      .prepare(str('SELECT * FROM Users', `WHERE UserId IN (${userIds.join(',')})`))
      .all();

    return results.filter(nonNullable).map(mapRecord);
  }

  async upsertUser({ email }: Partial<User>): Promise<void> {
    if (!email || !EmailValidator.validate(email)) {
      throw new HTTPException(400, { message: `Invalid email: ${email}` });
    }

    try {
      await this.db
        .prepare(str('INSERT INTO Users (Created, Email, Status)', 'VALUES (?1, ?2, ?3)'))
        .bind(Date.now(), email, Status.WAITING)
        .all();
    } catch (err) {
      if (String(err).match(/UNIQUE/i)) {
        throw new HTTPException(400, { message: `Email already registered: ${email}` });
      }

      throw err;
    }
  }

  async updateUser(userId: number, status: string) {
    await this.db.prepare('UPDATE Users SET Status = ?1 WHERE UserId = ?2').bind(status, userId).all();
  }

  async deleteUser(userId: string) {
    const { results } = await this.db.prepare('DELETE FROM Users WHERE UserId = ?1').bind(userId).all();
    invariant(results.length === 0);
  }

  async authorizeUsers(userIds: number[]): Promise<User[]> {
    if (userIds.length === 0) {
      return [];
    }

    const users = await this.getUsersById(userIds);

    // Create and update tokens.
    const batch = users.filter(nonNullable).map(({ id }) => {
      return this.db
        .prepare('UPDATE Users SET Status = ?1, AccessToken = ?2 WHERE UserId = ?3')
        .bind(Status.AUTHORIZED, PublicKey.random().toHex(), id);
    });

    // Validate result.
    const result = await this.db.batch(batch);
    invariant(!result.some(({ success }) => !success));

    return await this.getUsersById(userIds);
  }
}
