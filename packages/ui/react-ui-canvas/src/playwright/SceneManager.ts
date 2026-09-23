//
// Copyright 2026 DXOS.org
//

import { type Locator, type Page } from '@playwright/test';

type Box = { x: number; y: number; width: number; height: number };

/** Drives a `SceneView` story through the DOM: pointer gestures in screen space, state read from test ids. */
export class SceneManager {
  readonly root: Locator;

  constructor(readonly page: Page) {
    this.root = page.getByTestId('scene-view');
  }

  async ready(): Promise<void> {
    await this.root.waitFor({ state: 'visible', timeout: 45_000 });
    // The camera fits before the first paint; a beat lets storybook's first compile settle.
    await this.page.waitForTimeout(500);
  }

  async box(locator: Locator): Promise<Box> {
    const box = await locator.boundingBox();
    if (!box) {
      throw new Error('element has no box');
    }
    return box;
  }

  node(id: string): Locator {
    return this.page.locator(`[data-node-id="${id}"]`);
  }

  nodeCount(): Promise<number> {
    return this.page.locator('[data-node-id]').count();
  }

  /** Right edge of the rightmost node in screen space: canvas beyond it is empty whatever the layout. */
  async nodesRight(): Promise<number> {
    const boxes = await Promise.all((await this.page.locator('[data-node-id]').all()).map((node) => this.box(node)));
    return Math.max(...boxes.map(({ x, width }) => x + width));
  }

  /** The debug bar's zoom readout, as whole percent; the navigation bar carries the path and depth. */
  async zoom(): Promise<number> {
    const readout = await this.page.getByTestId('canvas-debug').textContent();
    const percent = readout?.match(/(\d+)%/);
    if (!percent) {
      throw new Error(`debug bar shows no zoom: ${readout}`);
    }
    return Number(percent[1]);
  }

  /** Ids of the nodes whose frame shows the selection border. */
  selectedNodes(): Promise<string[]> {
    return this.page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-node-id]'))
        .filter((element) => element.className.includes('border-primary-500 '))
        .map((element) => element.dataset.nodeId ?? ''),
    );
  }

  /** The `<g>` groups of the link layer, one per routed link. */
  linkCount(): Promise<number> {
    return this.page.locator('[data-testid="scene-view"] > div > div > svg g').count();
  }

  async clickNode(id: string): Promise<void> {
    const box = await this.box(this.node(id));
    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }

  /** Focus the canvas without changing the selection. */
  async focus(): Promise<void> {
    await this.root.focus();
  }

  /**
   * Wait out a camera animation. While one runs the view ignores the pointer behind a shield and the
   * scene is still moving under it, so a gesture is dropped and a measurement is of a moving target —
   * a timeout would be a guess at a duration that varies with the distance travelled.
   */
  async settle(): Promise<void> {
    await this.page.getByTestId('navigation-shield').waitFor({ state: 'detached', timeout: 10_000 });
  }

  /** Zoom by `steps` toolbar steps, each landed before the next. */
  async zoomIn(steps = 1): Promise<void> {
    await this.#zoom('toolbar-zoom-in', steps);
  }

  async zoomOut(steps = 1): Promise<void> {
    await this.#zoom('toolbar-zoom-out', steps);
  }

  async #zoom(testId: string, steps: number): Promise<void> {
    for (let step = 0; step < steps; ++step) {
      await this.page.getByTestId(testId).click();
      await this.settle();
    }
  }

  /** Press at `from`, move to `to` in steps, release; `modifier` is held for the whole gesture. */
  async drag(from: { x: number; y: number }, to: { x: number; y: number }, modifier?: string): Promise<void> {
    if (modifier) {
      await this.page.keyboard.down(modifier);
    }
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 });
    await this.page.mouse.move(to.x, to.y, { steps: 4 });
    await this.page.mouse.up();
    if (modifier) {
      await this.page.keyboard.up(modifier);
    }
    await this.page.waitForTimeout(200);
  }

  /** The resize handle of the single selected node on `side` (`e`, `w`, `n`, `s`). */
  async handle(nodeId: string, side: 'e' | 'w' | 'n' | 's'): Promise<Box> {
    const node = await this.box(this.node(nodeId));
    const cursor = side === 'e' || side === 'w' ? 'ew-resize' : 'ns-resize';
    const handles = await this.page.locator(`[data-testid="scene-view"] svg rect[style*="${cursor}"]`).all();
    for (const handle of handles) {
      const box = await this.box(handle);
      const beyond =
        side === 'e'
          ? box.x > node.x + node.width / 2
          : side === 'w'
            ? box.x < node.x + node.width / 2
            : side === 's'
              ? box.y > node.y + node.height / 2
              : box.y < node.y + node.height / 2;
      if (beyond) {
        return box;
      }
    }
    throw new Error(`no ${side} handle`);
  }
}
