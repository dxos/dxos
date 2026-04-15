//
// Copyright 2026 DXOS.org
//

const TRELLO_BASE = 'https://api.trello.com/1';

export type TrelloAuth = { readonly key: string; readonly token: string };
export type TrelloList = { id: string; name: string; closed: boolean };
export type TrelloCard = { id: string; name: string; desc: string; idList: string };

export const trelloRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  params: Record<string, string>,
  auth: TrelloAuth,
): Promise<T> => {
  const url = new URL(`${TRELLO_BASE}${path}`);
  url.searchParams.set('key', auth.key);
  url.searchParams.set('token', auth.token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString(), { method });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trello ${method} ${path} → ${response.status}: ${body.slice(0, 300)}`);
  }
  return (await response.json()) as T;
};

/** Resolve the canonical (long) board ID from a short board ID. */
export const resolveBoardId = async (shortId: string, auth: TrelloAuth): Promise<string> => {
  const board = await trelloRequest<{ id: string; name: string }>(
    'GET',
    `/boards/${shortId}`,
    { fields: 'id,name' },
    auth,
  );
  return board.id;
};

/** Move a card (by name, case-insensitive) to a list (by name). Returns the card id, or undefined if not found. */
export const moveCardToList = async (
  boardId: string,
  cardName: string,
  targetListName: string,
  auth: TrelloAuth,
): Promise<string | undefined> => {
  const canonicalBoardId = boardId.length > 10 ? boardId : await resolveBoardId(boardId, auth);

  const lists = await trelloRequest<TrelloList[]>(
    'GET',
    `/boards/${canonicalBoardId}/lists`,
    { fields: 'id,name,closed' },
    auth,
  );
  const targetList = lists.find((list) => !list.closed && list.name.toLowerCase() === targetListName.toLowerCase());
  if (!targetList) {
    throw new Error(`Trello list "${targetListName}" not found on board ${canonicalBoardId}`);
  }

  const cards = await trelloRequest<TrelloCard[]>(
    'GET',
    `/boards/${canonicalBoardId}/cards`,
    { fields: 'id,name,idList' },
    auth,
  );
  const card = cards.find((item) => item.name.toLowerCase() === cardName.toLowerCase());
  if (!card) {
    return undefined;
  }
  if (card.idList === targetList.id) {
    return card.id;
  }
  await trelloRequest<TrelloCard>('PUT', `/cards/${card.id}`, { idList: targetList.id }, auth);
  return card.id;
};
