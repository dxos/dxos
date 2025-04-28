//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { fullyQualifiedId, getSpace, makeRef } from '@dxos/react-client/echo';

import { type MeetingType } from '../types';

type MissingArtifactProps = {
  meeting: MeetingType;
  typename: string;
};

export const MissingArtifact = ({ meeting, typename }: MissingArtifactProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { graph } = useAppGraph();
  const companionNode = graph.findNode(`${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}${typename}`);
  const getIntent = companionNode?.properties.getIntent;

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

export default MissingArtifact;
