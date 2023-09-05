//
// Copyright 2023 DXOS.org
//

import formatDistance from 'date-fns/formatDistance';
import React from 'react';

export type DeployedTimestampProps = {
  className?: string;
  timestamp?: string;
};

export const DeployedTimestamp = (props: DeployedTimestampProps) => {
  const { timestamp, className } = props;
  return (
    <span className={'text-xs text-neutral-500 ' + (className ?? '')}>
      {timestamp ? 'Deployed ' + formatDistance(new Date(timestamp), new Date(), { addSuffix: true }) : null}
    </span>
  );
};
