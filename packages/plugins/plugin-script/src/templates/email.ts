//
// Copyright 2024 DXOS.org
//

/**
 * Appends a message to the end of a Document configured through a trigger.
 * Trigger must have a targetDocumentId field set in Meta.
 */
export default async ({ data: { bodyText }, context: { space } }: any) => {
  const { email, targetDocumentId: documentId } = JSON.parse(bodyText) as RequestPayload;

  const document = await space.db.query({ id: documentId }).first();

  const contentId = document.content['/'].split(':')[3];
  const documentContent = await space.db.query({ id: contentId }).first();
  const modifiedContent = [
    documentContent.content,
    '',
    '---',
    `**From:** ${email.from}`,
    `**Subject:** ${email.subject}`,
    `**Date:** ${email.created}`,
    '',
    email.body,
  ].join('\n');

  await space.db.update({ id: contentId }, { content: modifiedContent });

  return new Response(JSON.stringify({ success: true }));
};

type RequestPayload = {
  email: { from: string; subject: string; created: string; body: string };
  targetDocumentId: string;
};
