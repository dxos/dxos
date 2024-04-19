//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Zod schema.
// TODO(burdon): Validate email.
export type User = {
  id: number;
  created: Date;
  status: string; // TODO(burdon): Enum.
  email: string;
};

const mapRecord = ({ UserId, Created, Status, Email }: Record<string, unknown>) =>
  ({
    id: UserId as number,
    created: new Date(Created as number),
    status: Status as string,
    email: Email as string,
  }) satisfies User;

// TODO(burdon): Backup database.
// https://developers.cloudflare.com/d1/build-with-d1/d1-client-api

export const getUsers = async (db: D1Database): Promise<User[]> => {
  const { results } = await db.prepare('SELECT * FROM Users').all();
  return results.map(mapRecord);
};

export const upsertUser = async (db: D1Database, { email }: Partial<User>): Promise<User[]> => {
  // TODO(burdon): Check unique email.
  const { results } = await db
    .prepare(str('INSERT INTO Users (Created, Email, Status)', 'VALUES (?1, ?2, ?3)'))
    .bind(Date.now(), email, 'S')
    .all();

  return results.map(mapRecord);
};

const str = (...text: string[]) => text.join(' ');
