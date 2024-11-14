//
// Copyright 2024 DXOS.org
//

import { useEffect } from 'react';
import { useMount, usePrevious, useUnmount } from 'react-use';

import { log } from '@dxos/log';

import type { User } from '../types/Messages';
import { playSound } from '../utils/playSound';

export default (users: User[]) => {
  const previousUserCount = usePrevious(users.length);

  useEffect(() => {
    if (users.length > 5 || previousUserCount === undefined || previousUserCount === users.length) {
      return;
    }
    if (users.length > previousUserCount) {
      playSound('join').catch((err) => log.catch(err));
    } else {
      playSound('leave').catch((err) => log.catch(err));
    }
  }, [previousUserCount, users.length]);

  const raisedHandCound = users.filter((u) => u.raisedHand).length;
  const previousHandRaisedCount = usePrevious(raisedHandCound);

  useEffect(() => {
    if (previousHandRaisedCount === undefined || raisedHandCound === previousHandRaisedCount) {
      return;
    }
    if (raisedHandCound > previousHandRaisedCount) {
      playSound('raiseHand');
    }
  }, [raisedHandCound, previousHandRaisedCount]);

  useMount(() => {
    playSound('join');
  });

  useUnmount(() => {
    playSound('leave');
  });
};
