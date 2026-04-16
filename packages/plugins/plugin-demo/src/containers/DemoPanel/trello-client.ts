//
// Copyright 2026 DXOS.org
//

/**
 * Browser-side Trello REST helpers. Mirrors the slack-post.ts pattern: all
 * calls are plain fetch against api.trello.com with key+token in the query
 * string (Trello allows cross-origin with credentials in the URL).
 *
 * Used by the interactive-reply path in observers.ts to actually move a
 * Trello card when the user says "yes" in Slack.
 */

const BASE = 'https://api.trello.com/1';

export type TrelloAuth = { readonly key: string; readonly token: string };
export type TrelloList = { readonly id: string; readonly name: string };

/** Read Trello auth from localStorage. Returns undefined if any of the three is missing. */
export const readTrelloAuth = (): { auth: TrelloAuth; boardId: string } | undefined => {
  const key = globalThis.localStorage?.getItem('TRELLO_API_KEY') ?? '';
  const token = globalThis.localStorage?.getItem('TRELLO_API_TOKEN') ?? '';
  const boardId = globalThis.localStorage?.getItem('TRELLO_BOARD_ID') ?? '';
  if (!key || !token || !boardId) {
    return undefined;
  }
  return { auth: { key, token }, boardId };
};

const request = async <T>(path: string, params: Record<string, string>, auth: TrelloAuth, method: 'GET' | 'PUT' = 'GET'): Promise<T> => {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('key', auth.key);
  url.searchParams.set('token', auth.token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString(), { method });
  if (!response.ok) {
    throw new Error(`Trello ${method} ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
};

/** Resolve the canonical long board id from either form. */
export const canonicalBoardId = async (boardId: string, auth: TrelloAuth): Promise<string> => {
  if (boardId.length > 10) {
    return boardId;
  }
  const board = await request<{ id: string }>(`/boards/${boardId}`, { fields: 'id' }, auth);
  return board.id;
};

/** List all non-closed lists on a board. */
export const listsOnBoard = async (boardId: string, auth: TrelloAuth): Promise<TrelloList[]> => {
  const canonical = await canonicalBoardId(boardId, auth);
  return request<TrelloList[]>(`/boards/${canonical}/lists`, { fields: 'id,name' }, auth);
};

/** Move a card by trello id onto the list whose name matches `listName` (case-insensitive). */
export const moveCardToListByName = async (
  cardTrelloId: string,
  boardId: string,
  listName: string,
  auth: TrelloAuth,
): Promise<{ listId: string; listName: string }> => {
  const lists = await listsOnBoard(boardId, auth);
  const target = lists.find((list) => list.name.toLowerCase() === listName.toLowerCase());
  if (!target) {
    throw new Error(`Trello list "${listName}" not found on board`);
  }
  await request(`/cards/${cardTrelloId}`, { idList: target.id }, auth, 'PUT');
  return { listId: target.id, listName: target.name };
};
