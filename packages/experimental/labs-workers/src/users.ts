//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Zod schema.
// TODO(burdon): Validate email.
import { PublicKey } from '@dxos/keys';

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

export const getUsers = async (db: D1Database): Promise<User[]> => {
  const { results } = await db.prepare('SELECT * FROM Users').all();
  return results.map(mapRecord);
};

export const upsertUser = async (db: D1Database, { email }: Partial<User>): Promise<User[]> => {
  const { results } = await db
    .prepare(str('INSERT INTO Users (Created, Email, Status)', 'VALUES (?1, ?2, ?3)'))
    .bind(Date.now(), email, 'N')
    .all();

  return results.map(mapRecord);
};

const getUsersById = async (db: D1Database, userIds: string[]) => {
  const { results } = await db.prepare(str('SELECT * FROM Users', `WHERE UserId IN (${userIds.join(',')})`)).all();
  return results.map(mapRecord);
};

export const authUsers = async (db: D1Database, userIds: string[]) => {
  const users = await getUsersById(db, userIds);

  // Create and update tokens.
  const batch = users.map(({ id }) => {
    return db
      .prepare('UPDATE Users SET Status = ?1, AccessToken = ?2 WHERE UserId = ?3')
      .bind('A', PublicKey.random().toHex(), id);
  });

  await db.batch(batch);

  return await getUsersById(db, userIds);
};

const str = (...text: string[]) => text.join(' ');
