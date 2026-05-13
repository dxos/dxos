//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { ResearchGraph } from '@dxos/assistant-toolkit';
import { Filter } from '@dxos/echo';
import { EchoId } from '@dxos/keys';
import { useQuery, useQueue } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui';

import { type ComponentProps } from './types';

export const ResearchOutputModule = ({ space }: ComponentProps) => {
  const [researchGraph] = useQuery(space.db, Filter.type(ResearchGraph.ResearchGraph));
  const legacyDxn = researchGraph?.queue.dxn;
  const queueEchoId = useMemo(() => {
    if (!legacyDxn) return undefined;
    const echoDxn = legacyDxn.asEchoDXN();
    return echoDxn?.spaceId && echoDxn?.echoId
      ? EchoId.fromSpaceAndObjectId(echoDxn.spaceId, echoDxn.echoId as any)
      : undefined;
  }, [legacyDxn]);
  const queue = useQueue(queueEchoId);

  return (
    <ul className='flex flex-col gap-4 p-4 h-full overflow-y-auto'>
      {queue?.objects.map((object) => (
        <li key={object.id}>
          <Card.Root>
            <Surface.Surface role='card--content' data={{ subject: object }} limit={1} />
          </Card.Root>
        </li>
      ))}
    </ul>
  );
};
