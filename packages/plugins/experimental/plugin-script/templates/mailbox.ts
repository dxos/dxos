//
// Copyright 2024 DXOS.org
//

export const SOURCE_ID = 'hub.dxos.network/mailbox';

export default async ({
  event: {
    data: { request },
  },
  context: { space },
}: any) => {
  const {
    meta: { account = 'hello@dxos.network' } = {},
    data: { messages },
  } = await request.json();

  const mailbox = await space.crud.query({ __typename: 'dxos.org/type/Channel' }).first();
  for (const message of messages) {
    await space.crud.update(
      {},
      {}
    );

    const messageObject =
      const object = space.db.add(
        create(
          MessageType,
          {
            sender: {email: message.from},
            timestamp: new Date(message.created).toISOString(),
            text: message.body,
            properties: {
              subject: message.subject,
              to: [{email: message.to}],
            },
          },
          {
            keys: [foreignKey(SOURCE_ID, String(message.id))],
          },
        ),
    }
      await space.crud.update(
        { id: gameId },
        { pgn: newPgn }
      );

      );

      mailbox.threads[0]?.messages?.push(object);
    }
  return new Response(game.ascii());
};
