//
// Copyright 2022 DXOS.org
//

import { StackTrace } from '@dxos/debug';
import { log } from '@dxos/log';

const enabled = typeof process !== 'undefined' && !!process.env.DX_TRACK_LEAKS;

type OpenResource = {
  name: string;
  openStack: StackTrace;
};

const openResources = new Set<OpenResource>();

const handleSymbol = Symbol('checkLeaksHandle');

export const trackResource = (resourceProvider: () => OpenResource): (() => void) => {
  if (!enabled) {
    return () => {};
  }
  const resource = resourceProvider();

  openResources.add(resource);

  return () => {
    openResources.delete(resource);
  };
};

/**
 * Makes sure that the resource is at the end of the test.
 *
 * Example:
 *
 * ```typescript
 * @trackLeaks('open', 'close')
 * class Resource {}
 * ```
 */
export const trackLeaks =
  (open: string, close: string): ClassDecorator =>
  (target: any) => {
    if (!enabled) {
      return;
    }

    const openMethod = target.prototype[open];
    const closeMethod = target.prototype[close];
    if (!openMethod || !closeMethod) {
      throw new Error(`Cannot find ${open} or ${close} method in ${target.name}`);
    }

    {
      target.prototype[open] = async function (this: any, ...args: any) {
        this[handleSymbol] = trackResource(() => ({
          name: target.name,
          openStack: new StackTrace(),
        }));

        return openMethod.apply(this, args);
      };
      Object.defineProperty(target.prototype[open], 'name', { value: open + '$checkLeaks' });
    }

    {
      target.prototype[close] = async function (this: any, ...args: any) {
        this[handleSymbol]?.();

        return closeMethod.apply(this, args);
      };
      Object.defineProperty(target.prototype[close], 'name', { value: close + '$checkLeaks' });
    }
  };

export const dumpLeaks = () => {
  if (!enabled) {
    return;
  }

  log.info(`Leaked resources ${openResources.size}:`);
  for (const resource of openResources) {
    log.info(`- ${resource.name} at`);
    log.info(resource.openStack.getStack(1));
    log.info('\n');
  }
};

if (enabled) {
  (global as any).dxDumpLeaks = dumpLeaks;
}
