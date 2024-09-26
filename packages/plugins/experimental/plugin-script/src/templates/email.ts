//
// Copyright 2024 DXOS.org
//

/**
 * Stores a message into ECHO Mailbox object.
 */
export default async ({
  event: {
    data: { request },
  },
  context: { space },
}: any) => {
  const {
    data: {
      objects: [message],
    },
  } = await request.json();

  const mailbox = await space.crud.query({ __typename: 'dxos.org/type/MailboxType' }).first();
  if (!mailbox) {
    return new Response('Mailbox not found.', { status: 500 });
  }

  await space.crud.push(
    { id: mailbox.id },
    {
      sender: { email: message.from },
      timestamp: new Date(message.created).toISOString(),
      text: message.body,
      properties: {
        subject: message.subject,
        to: [{ email: message.to }],
      },
    },
  );
  return new Response(JSON.stringify(message));
};
