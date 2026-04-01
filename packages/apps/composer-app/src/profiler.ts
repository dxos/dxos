//
// Copyright 2025 DXOS.org
//

/**
 * Collects performance marks/measures from plugin-manager and dumps a startup timeline.
 */
export const startupProfiler = () => {
  performance.mark('startup:main:start');

  return {
    mark: (name: string) => performance.mark(`startup:${name}`),
    dump: () => {
      performance.mark('startup:ready');
      performance.measure('startup:total', 'startup:main:start', 'startup:ready');

      const entries = performance.getEntriesByType('measure');
      const eventEntries = entries
        .filter((entry) => entry.name.startsWith('event:'))
        .sort((first, second) => first.startTime - second.startTime);
      const moduleEntries = entries
        .filter((entry) => entry.name.startsWith('module:'))
        .sort((first, second) => second.duration - first.duration);
      const startupEntries = entries
        .filter((entry) => entry.name.startsWith('startup:'))
        .sort((first, second) => first.startTime - second.startTime);

      // eslint-disable-next-line no-console
      console.group('Startup Profile');

      // eslint-disable-next-line no-console
      console.log(
        'Total startup time:',
        Math.round(entries.find((entry) => entry.name === 'startup:total')?.duration ?? 0),
        'ms',
      );

      // eslint-disable-next-line no-console
      console.table(
        startupEntries.map((entry) => ({
          Phase: entry.name.replace('startup:', ''),
          'Duration (ms)': Math.round(entry.duration),
          'Start (ms)': Math.round(entry.startTime),
        })),
      );

      // eslint-disable-next-line no-console
      console.log(`\nActivation Events (${eventEntries.length}):`);
      // eslint-disable-next-line no-console
      console.table(
        eventEntries.map((entry) => ({
          Event: entry.name.replace('event:', ''),
          'Duration (ms)': Math.round(entry.duration),
          'Start (ms)': Math.round(entry.startTime),
        })),
      );

      // eslint-disable-next-line no-console
      console.log(`\nSlowest Modules (top 20 of ${moduleEntries.length}):`);
      // eslint-disable-next-line no-console
      console.table(
        moduleEntries.slice(0, 20).map((entry) => ({
          Module: entry.name.replace('module:', ''),
          'Duration (ms)': Math.round(entry.duration),
          'Start (ms)': Math.round(entry.startTime),
        })),
      );

      // eslint-disable-next-line no-console
      console.groupEnd();
    },
  };
};
