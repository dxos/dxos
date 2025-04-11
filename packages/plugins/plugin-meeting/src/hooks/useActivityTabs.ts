//
// Copyright 2025 DXOS.org
//

import { type AnyIntentChain, useAppGraph, type Label } from '@dxos/app-framework';
import { type ReactiveEchoObject } from '@dxos/echo-db';
import { getSchemaTypename } from '@dxos/echo-schema';
import { COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { useNode } from '@dxos/plugin-graph';
import { fullyQualifiedId, type Space } from '@dxos/react-client/echo';
import { byPosition, isNonNullable } from '@dxos/util';

import { type MeetingType } from '../types';

// TODO(wittjosiah): Factor out.
export const useCompanions = (object?: ReactiveEchoObject<any>) => {
  const { graph } = useAppGraph();
  const node = useNode(graph, object && fullyQualifiedId(object));
  return node ? graph.nodes(node, { type: COMPANION_TYPE }) : [];
};

export const useActivityTabs = (
  meeting: MeetingType,
): {
  label: Label;
  typename: string;
  getIntent: (options: { space: Space; meeting: MeetingType }) => AnyIntentChain;
  subject?: ReactiveEchoObject<any>;
}[] => {
  const companions = useCompanions(meeting);
  const filteredActivities = companions
    .toSorted((a, b) => byPosition(a.properties, b.properties))
    .map((companion) => {
      const { label, getIntent, schema } = companion.properties;
      const typename = schema && getSchemaTypename(schema);
      if (!typename || !getIntent) {
        return null;
      }

      const subject = meeting.artifacts[typename]?.target;
      return { label, typename, getIntent, subject };
    })
    .filter(isNonNullable);

  return filteredActivities;
};
