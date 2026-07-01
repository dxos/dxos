//
// Copyright 2026 DXOS.org
//

type SpaceArchiveObject = {
  '@type'?: string;
  'token'?: string;
};

/**
 * Loads the mock inbox space snapshot with OAuth tokens redacted so Storybook runs
 * do not depend on live connector credentials.
 */
export const loadMockInboxSnapshot = async (): Promise<unknown> => {
  const snapshot = await import('./profiles/mock-inbox.dx.json');
  return {
    ...snapshot,
    objects: snapshot.objects.map((object: SpaceArchiveObject) => {
      if (object['@type']?.includes('accessToken')) {
        return { ...object, token: 'redacted' };
      }
      return object;
    }),
  };
};
