//
// Copyright 2024 DXOS.org
//

import { useParams } from '@remix-run/react';
import invariant from 'tiny-invariant';

export const useRoomUrl = () => {
  const { roomName } = useParams();
  invariant(roomName);
  if (typeof window === 'undefined') {
    return '';
  }
  const url = new URL(window.location.href);
  url.pathname = roomName;
  return url.toString();
};
