//
// Copyright 2026 DXOS.org
//

/**
 * With snap on, a dragged or resized node lands on the major grid.
 *
 * @mdl packages/ui/react-ui-canvas/SPEC.mdl test QA-1 (step "Move and snap")
 * @app react-ui-canvas-editor storybook via `pnpm storybook dev --port=9006 --config-dir=.storybook` in the package, story
 *   `ui-react-ui-canvas-editor-components-canvaseditor--docked`
 */

// Reads the selected node's edges from the docked properties form, which edits the centre and the size.
const edges = async (page) => {
  const fields = page.locator('[data-testid="properties"] [role="spinbutton"]');
  const [x, y, width, height] = await Promise.all(
    [0, 1, 2, 3].map(async (index) => Number(await fields.nth(index).inputValue())),
  );
  return { left: x - width / 2, top: y - height / 2, right: x + width / 2 };
};

const node = (page) => page.locator('[data-node-id]').first();

const centre = async (page) => {
  const box = await node(page).boundingBox();
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const report = async ({ demo, page }, what) => {
  await page.waitForTimeout(400);
  const { left, top, right } = await edges(page);
  const on = [left, top, right].every((value) => value % 64 === 0);
  await demo.caption({
    value: `${what}: left ${left}, top ${top}, right ${right}`,
    subtitle: on ? 'every edge is a multiple of 64: the major grid' : 'not on the major grid (64)',
  });
  await page.waitForTimeout(2500);
};

const move = async ({ demo, page }, dx, dy) => {
  const from = await centre(page);
  await demo.drag({ fromXY: from, toXY: { x: from.x + dx, y: from.y + dy }, label: `drag ${dx}, ${dy} px` });
  await report({ demo, page }, `Dragged ${dx}, ${dy} px`);
};

export const steps = [
  {
    name: 'Turn snap on and select a node',
    setup: true,
    run: async ({ page }) => {
      const snap = page.getByTestId('toolbar-snap');
      if ((await snap.getAttribute('aria-pressed')) !== 'true') {
        await snap.click();
      }
      // Lines rather than dots, so the major lines the node lands on are visible.
      const lines = page.getByTestId('theme-grid-lines');
      if ((await lines.count()) > 0 && (await lines.getAttribute('aria-pressed')) !== 'true') {
        await lines.click();
      }
      const from = await centre(page);
      await page.mouse.click(from.x, from.y);
      await page.locator('[data-testid="properties"] [role="spinbutton"]').first().waitFor();
    },
  },
  {
    name: 'Title',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Snap to the major grid', subtitle: 'react-ui-canvas · Snap on', hold: 3600 });
      await report({ demo, page }, 'Start');
    },
  },
  { name: 'Drag a node a little', run: (context) => move(context, 37, 23) },
  { name: 'Drag it a little more', run: (context) => move(context, 11, 7) },
  { name: 'Drag it further', run: (context) => move(context, 60, 45) },
  {
    name: 'Resize from the east handle',
    run: async ({ demo, page }) => {
      const box = await node(page).boundingBox();
      const handles = await page.locator('[data-testid="scene-view"] svg rect[style*="ew-resize"]').all();
      let handle;
      for (const candidate of handles) {
        const bounds = await candidate.boundingBox();
        if (bounds && bounds.x > box.x + box.width / 2) {
          handle = bounds;
        }
      }
      const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
      await demo.drag({ fromXY: from, toXY: { x: from.x + 45, y: from.y }, label: 'resize 45 px' });
      await report({ demo, page }, 'Resized 45 px');
      await page.waitForTimeout(3000);
    },
  },
];
