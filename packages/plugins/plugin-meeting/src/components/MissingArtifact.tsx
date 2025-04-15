//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { type AnyIntentChain, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { getSpace, makeRef, type Space } from '@dxos/react-client/echo';

import { type MeetingType } from '../types';

type MissingArtifactProps = {
  meeting: MeetingType;
  getIntent: (options: { space: Space; meeting: MeetingType }) => AnyIntentChain;
  typename: string;
};

export const MissingArtifact = ({ meeting, getIntent, typename }: MissingArtifactProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const space = getSpace(meeting);
      invariant(space);
      const { data } = await dispatch(getIntent({ space, meeting }));
      meeting.artifacts[typename] = makeRef(data!.object);
    });
    return () => clearTimeout(timeout);
  }, [meeting, getIntent, typename]);

  return null;
};
