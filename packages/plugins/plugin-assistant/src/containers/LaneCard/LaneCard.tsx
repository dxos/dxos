//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ThreadCard, type ThreadCardProps } from '@dxos/react-ui-assistant';

export type LaneCardProps = ThreadCardProps;

/** The default {@link AssistantSurface.LaneCard} surface. */
export const LaneCard = (props: LaneCardProps) => <ThreadCard {...props} />;

LaneCard.displayName = 'LaneCard';

export default LaneCard;
