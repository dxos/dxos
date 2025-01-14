//
// Copyright 2024 DXOS.org
//

/**
 * Appends a message to the end of a Document configured through a trigger.
 * Trigger must have a targetDocumentId field set in Meta.
 */
export default async ({
  event: {
    data: { request },
  },
  context: { space },
}: any) => {
  const { data, trigger } = (await request.json()) as RequestPayload;

  const documentId = trigger.meta.targetDocumentId;
  const document = await space.db.query({ id: documentId }, { format: 'plain' }).first();

  const contentId = document.content['/'].split(':')[3];
  const documentContent = await space.db.query({ id: contentId }, { format: 'plain' }).first();
  const modifiedContent = [
    documentContent.content,
    '',
    '---',
    `**From:** ${data.from}`,
    `**Subject:** ${data.subject}`,
    `**Date:** ${data.created}`,
    '',
    data.body,
  ].join('\n');

  await space.db.update({ id: contentId }, { content: modifiedContent });

  return new Response(JSON.stringify({ success: true }));
};

type RequestPayload = {
  data: { from: string; subject: string; created: string; body: string };
  trigger: { meta: { targetDocumentId: string } };
};
