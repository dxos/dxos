import React from 'react';
import formatDistance from 'date-fns/formatDistance';

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
