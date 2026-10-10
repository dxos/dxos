//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Attached } from '../cdp.ts';
import { type ReactCounters } from '../types.ts';

/** Global the probe publishes its reader under; nothing in the app reads it. */
const REACT_PROBE_GLOBAL = '__dxosReactCounts';

/** Components per stage kept in the artifact. */
const TOP_N = 50;

/**
 * Installs a React devtools global hook before any page script runs, counting commits and renders.
 *
 * React looks the hook up once, when `react-dom` initializes, and calls `onCommitFiberRoot` after
 * every commit; the hook is the one supported way to observe renders with no change to the app.
 * The init script must therefore run before the bundle, which `addInitScript` guarantees. A Vite
 * React Refresh runtime (storybook's dev server) finds this hook and wraps it rather than replacing
 * it, so both keep working.
 *
 * Per commit, only the fibers that rendered are visited: React sets `PerformedWork` on a component
 * fiber whose render function ran, and bubbles it into `subtreeFlags` only along paths that were
 * not bailed out, so a subtree without the bit is skipped whole. The walk costs what the render
 * itself touched, which is why the probe is affordable.
 */
export const installReactProbe = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ globalName }: { globalName: string }) => {
      /** `PerformedWork` in ReactFiberFlags, unchanged since React 16. */
      const PERFORMED_WORK = 1;
      /** Fiber tags of components whose render is user code (ReactWorkTags). */
      const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]);

      type ContextItem = { memoizedValue: unknown; next: ContextItem | null };
      type Hook = { memoizedState: unknown; queue: unknown; next: Hook | null };
      type ComponentType = { displayName?: string; name?: string; render?: ComponentType; type?: ComponentType };
      type Fiber = {
        tag: number;
        type: unknown;
        flags: number;
        subtreeFlags?: number;
        child: Fiber | null;
        sibling: Fiber | null;
        alternate: Fiber | null;
        memoizedProps: unknown;
        memoizedState: unknown;
        dependencies?: { firstContext: ContextItem | null } | null;
      };
      type FiberRoot = { current: Fiber };

      const totals = { commits: 0, renders: 0, mounts: 0, wastedRenders: 0, renderers: 0 };
      const byComponent: Record<string, { renders: number; wasted: number }> = {};

      const isComponentType = (value: unknown): value is ComponentType =>
        (typeof value === 'function' || typeof value === 'object') && value !== null;

      const nameOf = (type: unknown): string => {
        if (!isComponentType(type)) {
          return '(unknown)';
        }
        return (
          type.displayName ||
          type.name ||
          (type.render && (type.render.displayName || type.render.name)) ||
          (type.type && (type.type.displayName || type.type.name)) ||
          '(anonymous)'
        );
      };

      const shallowEqual = (left: unknown, right: unknown): boolean => {
        if (Object.is(left, right)) {
          return true;
        }
        if (typeof left !== 'object' || typeof right !== 'object' || left === null || right === null) {
          return false;
        }
        const leftKeys = Object.keys(left);
        if (leftKeys.length !== Object.keys(right).length) {
          return false;
        }
        return leftKeys.every(
          (key) =>
            Object.prototype.hasOwnProperty.call(right, key) &&
            Object.is(Reflect.get(left, key), Reflect.get(right, key)),
        );
      };

      const isHook = (value: unknown): value is Hook => typeof value === 'object' && value !== null && 'next' in value;

      /** Stateful hooks only (`queue` set): effects and memos rebuild their cells on every render. */
      const hooksEqual = (fiber: Fiber, previous: Fiber): boolean => {
        if (fiber.tag === 1) {
          return Object.is(fiber.memoizedState, previous.memoizedState);
        }
        let hook = isHook(fiber.memoizedState) ? fiber.memoizedState : null;
        let previousHook = isHook(previous.memoizedState) ? previous.memoizedState : null;
        while (hook && previousHook) {
          if (hook.queue !== null && !Object.is(hook.memoizedState, previousHook.memoizedState)) {
            return false;
          }
          hook = hook.next;
          previousHook = previousHook.next;
        }
        return true;
      };

      const contextsEqual = (fiber: Fiber, previous: Fiber): boolean => {
        let item = fiber.dependencies?.firstContext ?? null;
        let previousItem = previous.dependencies?.firstContext ?? null;
        while (item && previousItem) {
          if (!Object.is(item.memoizedValue, previousItem.memoizedValue)) {
            return false;
          }
          item = item.next;
          previousItem = previousItem.next;
        }
        return true;
      };

      const visit = (root: Fiber): void => {
        const stack: Fiber[] = [root];
        while (stack.length > 0) {
          const fiber = stack.pop();
          if (!fiber) {
            continue;
          }
          if (COMPONENT_TAGS.has(fiber.tag) && (fiber.flags & PERFORMED_WORK) !== 0) {
            const name = nameOf(fiber.type);
            const entry = (byComponent[name] ??= { renders: 0, wasted: 0 });
            totals.renders += 1;
            entry.renders += 1;
            const previous = fiber.alternate;
            if (previous === null) {
              totals.mounts += 1;
            } else if (
              shallowEqual(fiber.memoizedProps, previous.memoizedProps) &&
              hooksEqual(fiber, previous) &&
              contextsEqual(fiber, previous)
            ) {
              totals.wastedRenders += 1;
              entry.wasted += 1;
            }
          }
          // Without `subtreeFlags` (React 17 and older) nothing tells a rendered subtree from a
          // bailed-out one, so the walk descends everywhere.
          if (fiber.subtreeFlags === undefined || (fiber.subtreeFlags & PERFORMED_WORK) !== 0) {
            for (let child = fiber.child; child; child = child.sibling) {
              stack.push(child);
            }
          }
        }
      };

      const renderers = new Map<number, unknown>();
      let nextId = 1;
      const hook = {
        renderers,
        supportsFiber: true,
        inject: (renderer: unknown): number => {
          const id = nextId++;
          renderers.set(id, renderer);
          totals.renderers += 1;
          return id;
        },
        onCommitFiberRoot: (_id: number, root: FiberRoot): void => {
          totals.commits += 1;
          try {
            visit(root.current);
          } catch {
            // A fiber shape this probe does not know must not break the app's commit.
          }
        },
        onCommitFiberUnmount: (): void => {},
        onPostCommitFiberRoot: (): void => {},
        onScheduleFiberRoot: (): void => {},
        checkDCE: (): void => {},
      };

      if (Reflect.get(globalThis, '__REACT_DEVTOOLS_GLOBAL_HOOK__') === undefined) {
        Object.defineProperty(globalThis, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
          value: hook,
          configurable: true,
          writable: true,
        });
      }
      Object.defineProperty(globalThis, globalName, {
        value: () => JSON.stringify({ ...totals, byComponent }),
        configurable: true,
      });
    },
    { globalName: REACT_PROBE_GLOBAL },
  );
};

/** One reading of the page's cumulative counts. */
export type ReactReading = ReactCounters & { byComponent: Record<string, { renders: number; wasted: number }> };

const EXPRESSION = `(() => {
  const read = globalThis['${REACT_PROBE_GLOBAL}'];
  return typeof read === 'function' ? read() : null;
})()`;

type RemoteResult = { result?: { value?: unknown } };

const isReading = (value: unknown): value is ReactReading =>
  typeof value === 'object' && value !== null && typeof Reflect.get(value, 'commits') === 'number';

/** Reads the probe in the page; undefined when it is absent (not installed, or the page navigated away). */
export const readReact = async (page: Attached | undefined): Promise<ReactReading | undefined> => {
  const response = await page?.cdp.trySend<RemoteResult>(
    'Runtime.evaluate',
    { expression: EXPRESSION, returnByValue: true },
    { timeoutMs: 10_000 },
  );
  const serialized = response?.result?.value;
  if (typeof serialized !== 'string') {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    return isReading(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/**
 * The stage's React work, and its per-component breakdown written as an artifact.
 *
 * A missing opening reading means the page loaded during the stage (`boot`), so the whole closing
 * reading is the stage's — as is one that went BACKWARDS, which means the page reloaded and the
 * counts restarted. `renderers` is a level and is taken from the close.
 */
export const diffReact = (
  opening: ReactReading | undefined,
  after: ReactReading,
  { stage, outputDir }: { stage: string; outputDir: string },
): { counters: ReactCounters; file: string } => {
  const before = opening && opening.commits <= after.commits ? opening : undefined;
  const counters: ReactCounters = {
    commits: after.commits - (before?.commits ?? 0),
    renders: after.renders - (before?.renders ?? 0),
    mounts: after.mounts - (before?.mounts ?? 0),
    wastedRenders: after.wastedRenders - (before?.wastedRenders ?? 0),
    renderers: after.renderers,
  };
  const components = Object.entries(after.byComponent)
    .map(([name, { renders, wasted }]) => ({
      name,
      renders: renders - (before?.byComponent[name]?.renders ?? 0),
      wasted: wasted - (before?.byComponent[name]?.wasted ?? 0),
    }))
    .filter(({ renders }) => renders > 0)
    .sort((left, right) => right.renders - left.renders)
    .slice(0, TOP_N);
  mkdirSync(outputDir, { recursive: true });
  const file = path.join(outputDir, `${stage}-react.json`);
  writeFileSync(file, JSON.stringify(components, null, 2));
  return { counters, file };
};
