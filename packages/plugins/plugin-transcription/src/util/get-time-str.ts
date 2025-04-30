//
// Copyright 2025 DXOS.org
//

export const getTimeStr = (timestamp?: number) =>
  new Date(timestamp ?? Date.now()).toLocaleTimeString('en-US', {
    timeZone: 'UTC',
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
