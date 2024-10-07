//
// Copyright 2024 DXOS.org
//

import { useQuery } from 'react-query';

import { useRoomContext } from './useRoomContext';

interface UserMetadata {
  displayName: string;
  firstName?: string;
  lastName?: string;
  timeZone?: string;
  photob64?: string;
}

export const useUserMetadata = (email: string) => {
  const { userDirectoryUrl } = useRoomContext()!;
  const search = new URLSearchParams({ email });

  const key = `${userDirectoryUrl}?${search}`;

  const initialData: UserMetadata = {
    displayName: email,
  };

  return useQuery({
    initialData,
    queryKey: [key],
    queryFn: async ({ queryKey: [key] }) => {
      if (userDirectoryUrl === undefined) {
        return Promise.resolve(initialData);
      }
      const response = await fetch(key, { credentials: 'include' });

      if (response.headers.get('Content-Type')?.startsWith('application/json')) {
        const parsedData: UserMetadata = (await response.json()) as any;
        return {
          ...parsedData,
          displayName: `${parsedData.firstName} ${parsedData.lastName}`,
        };
      }
      return initialData;
    },
  });
};
