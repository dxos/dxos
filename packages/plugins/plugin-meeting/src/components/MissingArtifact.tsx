//
// Copyright 2025 DXOS.org
//

import { useEffect } from 'react';

import { useAppGraph, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { fullyQualifiedId, getSpace, Ref.make } from '@dxos/react-client/echo';

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
      // TODO(wittjosiah): This check shouldn't be necessary, this component should only render if it's missing.
      if (meeting.artifacts[typename] == null) {
        const space = getSpace(meeting);
        invariant(space);
        const { data } = await dispatch(getIntent({ space, meeting }));
        if (meeting.artifacts[typename] == null) {
          meeting.artifacts[typename] = makeRef(data!.object);
        }
      }
    });
    return () => clearTimeout(timeout);
  }, [meeting, getIntent, typename]);

  return null;
};

export default MissingArtifact;
