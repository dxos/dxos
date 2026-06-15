//
// Copyright 2025 DXOS.org
//

import { type Locator, type Page, expect } from '@playwright/test';

/**
 * Edge of the target tile to drop on. Pragmatic-dnd assigns the closest edge
 * based on cursor position; a stale (pre-layout-shift) cursor can land in the
 * wrong half. When `dragTo` is called with an `edge`, the helper waits for the
 * target tile to register the drag, re-measures the target after the
 * placeholder has expanded, repositions the cursor near the requested edge,
 * and confirms via `data-mosaic-tile-edge` before releasing.
 */
export type DragEdge = 'top' | 'bottom' | 'left' | 'right';

export class BoardManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  columns(): Locator {
    return this.locator.getByTestId('board-column');
  }

  column(index: number): ColumnManager {
    return new ColumnManager(this.locator.getByTestId('board-column').nth(index));
  }
}

export class ColumnManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  items(): Locator {
    return this.locator.getByTestId('board-item');
  }

  item(index: number): ItemManager {
    return new ItemManager(this.locator.getByTestId('board-item').nth(index));
  }

  async addItem(): Promise<void> {
    await this.locator.getByTestId('board-column-add-item').click();
  }

  header(): Locator {
    return this.locator.getByTestId('board-column-header');
  }

  title(): Locator {
    return this.locator.getByTestId('mosaicBoard.columnTitle');
  }

  async dragTo(target: Locator, offset = { x: 0, y: 0 }): Promise<void> {
    const handle = this.header().getByTestId('mosaicBoard.columnDragHandle');
    const handleBox = await handle.boundingBox();
    if (!handleBox) {
      return;
    }

    await handle.hover();
    await this._page.mouse.down();
    // Small initial movement to trigger the native drag start.
    await this._page.mouse.move(handleBox.x + handleBox.width / 2 + 1, handleBox.y + handleBox.height / 2, {
      steps: 1,
    });
    // Allow the drag monitor to register and the DOM to settle
    // (the dragged column is removed from visible items, shifting remaining columns).
    await this._page.waitForTimeout(200);
    const box = await target.boundingBox();
    if (box) {
      await this._page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
      // Allow the drop target to process the hover before releasing.
      await this._page.waitForTimeout(100);
      await this._page.mouse.up();
    }
  }
}

export class ItemManager {
  private readonly _page: Page;

  constructor(readonly locator: Locator) {
    this._page = locator.page();
  }

  title(): Locator {
    return this.locator.getByTestId('mosaicBoard.cardTitle');
  }

  async dragTo(target: Locator, offset: { x: number; y: number } = { x: 0, y: 0 }, edge?: DragEdge): Promise<void> {
    const handle = this.locator.getByTestId('mosaicBoard.cardDragHandle');
    const handleBox = await handle.boundingBox();
    if (!handleBox) {
      return;
    }

    // Capture stable ElementHandles to source and target before the drag
    // begins. Both `nth(N)` locators shift when `useVisibleItems` filters the
    // source out of its column, so we need raw DOM references that survive
    // the reconciliation.
    const targetHandle = await target.elementHandle();
    const box = targetHandle ? await targetHandle.boundingBox() : null;
    if (!targetHandle || !box) {
      return;
    }
    const sourceHandle = await this.locator.elementHandle();

    await handle.hover();
    await this._page.mouse.down();
    // Allow the drag monitor to register the grab before moving.
    await this._page.waitForTimeout(100);

    if (edge) {
      // Stage 1: trigger the dragstart. A 1-pixel nudge near the press
      // point primes pragmatic-dnd's HTML5 dragstart, then a long move
      // over the target tile commits the drag past every browser's
      // "click vs drag" threshold.
      await this._page.mouse.move(handleBox.x + handleBox.width / 2 + 1, handleBox.y + handleBox.height / 2, {
        steps: 1,
      });
      await this._page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });

      // Wait for `data-mosaic-container-state="active"` so we know the
      // dragstart has been processed. This alone is *not* enough: pragmatic-
      // dnd's `monitorForElements.onDragStart` (Root.tsx) and the
      // `dropTargetForElements.onDragStart` (Container.tsx) write into
      // independent React state, and only the latter drives the attribute.
      // The former drives `useVisibleItems` filtering, which is what
      // physically reflows the column. So we ALSO wait for the source tile
      // to detach from the DOM — that's the unambiguous signal that the
      // reflow has happened and any cached bbox is stale.
      await expect
        .poll(() => this._page.locator('[data-mosaic-container-state="active"]').count(), { timeout: 2000 })
        .toBeGreaterThan(0);
      if (sourceHandle) {
        await this._page.waitForFunction((el) => !el || !el.isConnected, sourceHandle, { timeout: 2000 });
      }

      // Stage 2: walk siblings on the (now reflowed) drag-time DOM and aim
      // at the placeholder representing the requested edge. The Fragment
      // keying on item id keeps the target tile's adjacent placeholder DOM
      // node stable across reconciliation, but its `location` prop and bbox
      // both change once the source is filtered out — measure after the
      // reflow, never before.
      const placeholderHandle = await this._adjacentPlaceholder(targetHandle, edge);
      if (placeholderHandle) {
        const phBox = await placeholderHandle.boundingBox();
        if (phBox) {
          const aimX = phBox.x + phBox.width / 2;
          const aimY = phBox.y + Math.max(phBox.height / 2, 1);
          await this._page.mouse.move(aimX, aimY, { steps: 4 });

          // Some browser/CDP combinations need a follow-up nudge to push
          // the dragOver event through — re-aim with a 1px offset and poll.
          const isActive = () =>
            placeholderHandle.evaluate((el) => el.getAttribute('data-mosaic-placeholder-state') === 'active');
          if (!(await isActive())) {
            const start = Date.now();
            let nudge = 0;
            while (Date.now() - start < 3000) {
              await this._page.waitForTimeout(100);
              nudge = (nudge + 1) % 4;
              const dx = nudge === 0 || nudge === 2 ? 1 : -1;
              const dy = nudge === 1 || nudge === 2 ? 1 : -1;
              await this._page.mouse.move(aimX + dx, aimY + dy, { steps: 1 });
              if (await isActive()) {
                break;
              }
            }
            await expect
              .poll(() => placeholderHandle.evaluate((el) => el.getAttribute('data-mosaic-placeholder-state')), {
                timeout: 1000,
              })
              .toBe('active');
          }

          // Re-centre on the now-expanded placeholder so the drop lands
          // solidly inside it.
          const expanded = await placeholderHandle.boundingBox();
          if (expanded) {
            await this._page.mouse.move(expanded.x + expanded.width / 2, expanded.y + expanded.height / 2, {
              steps: 2,
            });
          }
        }
      }
    } else {
      // Legacy path: no explicit edge — rely on the offset placement and a
      // small settle delay before releasing.
      await this._page.mouse.move(offset.x + box.x + box.width / 2, offset.y + box.y + box.height / 2, { steps: 4 });
      await this._page.waitForTimeout(100);
    }
    await this._page.mouse.up();
  }

  /**
   * Find the placeholder element adjacent to `target` on the requested
   * side via DOM walk. Returns `null` if the target has no matching
   * sibling (e.g. when the caller passes a non-tile target).
   */
  private async _adjacentPlaceholder(
    targetHandle: import('@playwright/test').ElementHandle<Element | SVGElement | HTMLElement>,
    edge: DragEdge,
  ): Promise<import('@playwright/test').ElementHandle<HTMLElement> | null> {
    const before = edge === 'top' || edge === 'left';
    const result = await targetHandle.evaluateHandle((el, beforeArg) => {
      let sibling: Element | null = beforeArg ? el.previousElementSibling : el.nextElementSibling;
      while (sibling && !sibling.hasAttribute('data-mosaic-placeholder-location')) {
        sibling = beforeArg ? sibling.previousElementSibling : sibling.nextElementSibling;
      }
      return sibling as HTMLElement | null;
    }, before);
    const handle = result.asElement() as import('@playwright/test').ElementHandle<HTMLElement> | null;
    if (!handle) {
      return null;
    }
    // `evaluateHandle` returning `null` still produces a non-null JSHandle —
    // verify the underlying element actually exists.
    const exists = await handle.evaluate((el) => el !== null);
    return exists ? handle : null;
  }

  /**
   * Drag this item to a column's scroll bottom, using auto-scroll when needed,
   * then drop on the target item.
   *
   * When the target is already visible in the viewport (no scrolling needed), the
   * item is dragged directly to the target. When the target is below the viewport,
   * the mouse is held near the footer to trigger pragmatic auto-scroll until the
   * target scrolls into view.
   *
   * @param holdTarget - The footer element; mouse is held ~20px above it to trigger auto-scroll.
   * @param dropTarget - The element to drop on.
   * @param dropOffset - Offset from the drop target center.
   */
  async dragToEndWithAutoScroll(holdTarget: Locator, dropTarget: Locator, dropOffset = { x: 0, y: 0 }): Promise<void> {
    const handle = this.locator.getByTestId('mosaicBoard.cardDragHandle');
    const holdBox = await holdTarget.boundingBox();
    if (!holdBox) {
      return;
    }

    // The hold position is ~20px above the footer to trigger pragmatic auto-scroll.
    const holdX = holdBox.x + holdBox.width / 2;
    const holdY = holdBox.y - 20;

    // Check if drop target is already visible before starting the drag.
    // Items may fit in the viewport without scrolling, in which case auto-scroll
    // is not needed and the loop's exit condition would never be satisfied.
    const preDropBox = await dropTarget.boundingBox();
    const needsScroll = !preDropBox || preDropBox.y >= holdBox.y;

    await handle.hover();
    await this._page.mouse.down();
    // Allow the drag monitor to register the grab before moving.
    await this._page.waitForTimeout(100);

    if (!needsScroll) {
      // Target is already visible — drag directly without auto-scroll.
      await this._page.mouse.move(holdX, holdY, { steps: 4 });
      const dropBox = await dropTarget.boundingBox();
      if (dropBox) {
        const dropX = dropOffset.x + dropBox.x + dropBox.width / 2;
        const dropY = dropOffset.y + dropBox.y + dropBox.height / 2;
        await this._page.mouse.move(dropX, dropY, { steps: 8 });
        await this._page.waitForTimeout(200);
        await this._page.mouse.up();
        return;
      }
      await this._page.mouse.up();
      return;
    }

    // Move to hold position above the footer to trigger auto-scroll.
    await this._page.mouse.move(holdX, holdY, { steps: 4 });

    // Hold and nudge mouse periodically to keep auto-scroll active until drop target is visible.
    for (let i = 0; i < 40; i++) {
      // Wait between nudges to give auto-scroll time to advance.
      await this._page.waitForTimeout(200);
      // Small nudge to keep drag events firing (auto-scroll stalls without movement).
      await this._page.mouse.move(holdX + (i % 2), holdY, { steps: 1 });

      const dropBox = await dropTarget.boundingBox();
      if (dropBox && dropBox.y + dropBox.height < holdY) {
        // Drop target has scrolled into view. Re-read box so we use current position (scroll may have moved it).
        const finalBox = await dropTarget.boundingBox();
        if (!finalBox) {
          await this._page.mouse.up();
          return;
        }

        const dropX = dropOffset.x + finalBox.x + finalBox.width / 2;
        const dropY = dropOffset.y + finalBox.y + finalBox.height / 2;
        await this._page.mouse.move(dropX, dropY, { steps: 8 });
        // Let drop target receive dragOver and settle (headless is faster; needs a moment to register).
        await dropTarget.waitFor({ state: 'visible' });
        await this._page.waitForTimeout(200);
        await this._page.mouse.up();
        return;
      }
    }

    // Fallback: drop wherever we are.
    await this._page.mouse.up();
  }
}
