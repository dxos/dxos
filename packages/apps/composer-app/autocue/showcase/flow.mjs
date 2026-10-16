//
// Copyright 2026 DXOS.org
//

/**
 * Plugin showcase: one ~5s clip per plugin, for the GridZoom montage. Each plugin has a `setup` step that creates
 * its object off the clip, and a `clip: <plugin>` step whose first 5s are cut out of the session by its timeline time.
 * `pipeline.sh` records it with the committed flows, lays out the grid and records the composite; the recording rules
 * are in packages/ui/react-ui-canvas/src/components/GridZoom/SHOWCASE.md.
 *
 * @app composer-app via `DX_PWA=false moon run composer-app:serve -- --port 4173`
 */

const CLIP_MS = 5_500;

/** Morphy's Opera Game, 1858. */
const OPERA_GAME =
  '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 ' +
  '10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#';

const PLUGINS = [
  'map',
  'mermaid',
  'chess',
  'game',
  'explorer',
  'terra',
  'spacetime',
  'sequencer',
  'handpan',
  'presenter',
  'script',
  'code',
  'board',
  'voxel',
  'uml',
  'conductor',
  'sheet',
  'table',
  'markdown',
  'kanban',
  'tldraw',
  'excalidraw',
  'canvas',
  'illustrator',
  'projects',
  'tasks',
].map((id) => `org.dxos.plugin.${id}`);

const visible = (locator, timeout = 1_500) =>
  locator
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    );

/** Opens the create dialog for a type, fills an optional name, and submits whatever form follows. */
const create = async (page, type, { name, variant, before } = {}) => {
  await page.keyboard.press('Escape');
  // Closing the last clip's plank stops it rendering; headless WebGL otherwise starves the page.
  for (const close of await page.locator('[data-testid="plankHeading.close"]').all()) {
    await close.click({ timeout: 2_000 }).catch(() => {});
  }
  await page.waitForTimeout(500);
  const button = page.locator('[data-testid="spacePlugin.createObject"]');
  // Another workspace (the plugin registry) hides the space tree; the rail's space button brings it back.
  if (!(await visible(button, 1_000))) {
    await page.locator('[data-testid="spacePlugin.space"]').first().click();
  }
  await button.first().click({ timeout: 20_000 });
  await page.locator(`[data-testid="create-object-form.type.org.dxos.type.${type}"]`).first().click();
  await page.waitForTimeout(600);
  if (variant) {
    await page.locator(`[role="dialog"] [role="option"]:has-text("${variant}")`).first().click();
  }
  await before?.(page);
  const dialog = page.locator('[role="dialog"]');
  if (await visible(dialog, 800)) {
    if (name) {
      const input = dialog.locator('input').first();
      if (await visible(input, 500)) {
        await input.fill(name);
      }
    }
    const save = dialog.locator('[data-testid="save-button"], button:has-text("Create"), button:has-text("Continue")');
    if (await visible(save, 1_000)) {
      await save.first().click();
    }
  }
  await page.waitForTimeout(2_500);
  const box = await page.locator('[data-testid="deck.plank"]').last().boundingBox();
  console.log(`[showcase] plank ${type} ${JSON.stringify(box)}`);
};

/** Drags across the centre of the plank in a slow arc, as a person orbiting or panning would. */
const orbit = async (page, { dx = 500, dy = 80, steps = 60, ms = 4_500, button = 'left' } = {}) => {
  // The plank sits right of the 350px sidebar.
  const { width, height } = page.viewportSize();
  const cx = 350 + (width - 400) / 2;
  const cy = height / 2;
  await page.mouse.move(cx - dx / 2, cy - dy / 2);
  await page.mouse.down({ button });
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx - dx / 2 + (dx * i) / steps, cy - dy / 2 + dy * Math.sin((Math.PI * i) / steps));
    await page.waitForTimeout(ms / steps);
  }
  await page.mouse.up({ button });
};

const clip = (name, run) => ({
  name: `clip: ${name}`,
  run: async (ctx) => {
    const start = Date.now();
    await run(ctx).catch((err) => console.log(`[showcase] FAILED clip ${name}: ${err.message.split('\n')[0]}`));
    const rest = CLIP_MS - (Date.now() - start);
    if (rest > 0) {
      await ctx.page.waitForTimeout(rest);
    }
  },
});

/** Types as a person would. */
const type = (page, text, delay = 40) => page.keyboard.type(text, { delay });

/** A stepped drag, so canvases that arm on movement see one. */
const drag = async (page, from, to, steps = 15) => {
  await page.mouse.move(from.x, from.y, { steps: 4 });
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
};

const BATCHES = {
  one: [
    {
      name: 'setup: map',
      setup: true,
      run: async ({ page }) => {
        await create(page, 'map', { name: 'World' });
        // Zoomed in off the clip, so the pan crosses named cities.
        await page.mouse.move(1500, 450);
        for (let i = 0; i < 6; i++) {
          await page.mouse.wheel(0, -200);
          await page.waitForTimeout(300);
        }
        await page.waitForTimeout(2_500);
      },
    },
    clip('map', async ({ page }) => {
      await orbit(page, { dx: -900, dy: 200, ms: 4_800 });
    }),

    { name: 'setup: terra', setup: true, run: ({ page }) => create(page, 'terra') },
    clip('terra', ({ page }) => orbit(page, { dx: 700, dy: 120 })),

    { name: 'setup: spacetime', setup: true, run: ({ page }) => create(page, 'spacetime.scene') },
    clip('spacetime', ({ page }) => orbit(page, { dx: 600, dy: 150 })),

    { name: 'setup: voxel', setup: true, run: ({ page }) => create(page, 'voxel') },
    clip('voxel', ({ page }) => orbit(page, { dx: 600, dy: 150 })),

    { name: 'setup: explorer', setup: true, run: ({ page }) => create(page, 'graph', { name: 'Graph' }) },
    clip('explorer', ({ page }) => orbit(page, { dx: 200, dy: 200, ms: 3_000 })),

    { name: 'setup: sheet', setup: true, run: ({ page }) => create(page, 'sheet') },
    clip('sheet', async ({ page }) => {
      for (const [index, row] of [
        ['Q1', '120', '=B1*2'],
        ['Q2', '140', '=B2*2'],
        ['Q3', '95', '=B3*2'],
      ].entries()) {
        await page
          .locator(`.dx-grid [data-dx-grid-plane="grid"] [aria-colindex="0"][aria-rowindex="${index}"]`)
          .first()
          .click();
        for (const [col, value] of row.entries()) {
          await page.keyboard.type(value, { delay: 40 });
          await page.waitForTimeout(250);
          await page.keyboard.press(col < row.length - 1 ? 'Tab' : 'Enter');
        }
      }
    }),
  ],
  mermaid: [
    // Mermaid: a diagram in a document grows as edges are typed.
    {
      name: 'setup: mermaid',
      setup: true,
      run: async ({ page }) => {
        await create(page, 'document');
        await page.locator('.cm-content').last().click();
        // Inserted whole, since typed lines are auto-indented; the cursor is left inside the closed fence.
        // A paragraph after the block parks the cursor far enough away that the diagram renders.
        await page.keyboard.insertText('```mermaid\ngraph LR\n  Idea --> Draft\n```\n\nThe review loop.');
        await page.waitForTimeout(1_500);
      },
    },
    clip('mermaid', async ({ page }) => {
      // Each edge goes in under `graph LR` (line 2), then the cursor leaves the block so the diagram renders.
      for (const line of ['Draft --> Review', 'Review --> Publish', 'Review --> Draft', 'Publish --> Readers']) {
        await page.keyboard.press('Meta+Home');
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('End');
        await page.keyboard.insertText(`\n  ${line}`);
        await page.keyboard.press('Meta+End');
        await page.waitForTimeout(1_100);
      }
    }),
  ],
  three: [
    // Chess: the Opera Game, replayed move by move.
    {
      name: 'setup: chess',
      setup: true,
      run: async ({ page }) => {
        await create(page, 'game', {
          variant: 'Chess',
          before: async (page) => {
            await page.locator('[role="dialog"] button:has-text("Continue")').first().click();
            await page.locator('[role="dialog"] input[data-testid="pgn"]').fill(OPERA_GAME);
          },
        });
        await page.mouse.click(1270, 540);
        await page.keyboard.press('ArrowUp');
        await page.waitForTimeout(800);
      },
    },
    clip('chess', async ({ page }) => {
      for (let i = 0; i < 16; i++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(320);
      }
    }),

    // Handpan: a melody played around the ring.
    { name: 'setup: handpan', setup: true, run: ({ page }) => create(page, 'instrument', { name: 'Handpan' }) },
    clip('handpan', async ({ page }) => {
      for (const label of ['D', '1', '3', '5', '7', '8', '6', '4', '2', 'D', '5', '8']) {
        await page.locator(`[data-testid="handpan.note.${label}"]`).first().click();
        await page.waitForTimeout(380);
      }
    }),

    // Projects: a template project, switching between its tabs.
    {
      name: 'setup: project',
      setup: true,
      run: ({ page }) => create(page, 'project', { variant: 'Composer Plugin', name: 'World Clock' }),
    },
    clip('project', async ({ page }) => {
      await page.waitForTimeout(1_200);
      await page.locator('[data-testid="projectsPlugin.tab.tasks"], [role="tab"]:has-text("Tasks")').first().click();
      await page.waitForTimeout(2_000);
      await page.mouse.move(1270, 600);
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel(0, 60);
        await page.waitForTimeout(120);
      }
    }),
  ],
  two: [
    // Markdown: type into a new document.
    { name: 'setup: markdown', setup: true, run: ({ page }) => create(page, 'document') },
    clip('markdown', async ({ page }) => {
      await page.locator('.cm-content').last().click();
      await type(
        page,
        // The editor continues a list on Enter, so only the first item types its own marker.
        '# Field notes\n\nLocal-first apps keep **your data** on your device.\n\n- Works offline\nSyncs peer to peer',
        28,
      );
    }),

    // Presenter: a document split into slides on `---`, presented and paged.
    {
      name: 'setup: presenter',
      setup: true,
      run: async ({ page }) => {
        await create(page, 'document');
        await page.locator('.cm-content').last().click();
        await type(
          page,
          '# Composer\n\nLocal-first collaboration\n\n---\n\n# Spaces\n\nShared, encrypted, offline\n\n---\n\n# Agents\n\nWork alongside you\n\n---\n\n# Plugins\n\nExtend everything\n',
          3,
        );
        await page.keyboard.press('Shift+Meta+P');
        await page.waitForTimeout(2_500);
      },
    },
    clip('presenter', async ({ page }) => {
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(1_300);
        await page.keyboard.press('ArrowRight');
      }
    }),

    // Drawings: each variant draws a few shapes.
    { name: 'setup: tldraw', setup: true, run: ({ page }) => create(page, 'drawing', { variant: 'tldraw' }) },
    clip('tldraw', async ({ page }) => {
      await page.keyboard.press('r');
      await drag(page, { x: 800, y: 300 }, { x: 1100, y: 500 });
      await page.keyboard.press('o');
      await drag(page, { x: 1250, y: 320 }, { x: 1500, y: 560 });
      await page.keyboard.press('a');
      await drag(page, { x: 1100, y: 400 }, { x: 1250, y: 440 });
      await page.keyboard.press('d');
      await drag(page, { x: 850, y: 700 }, { x: 1450, y: 720 }, 30);
    }),

    { name: 'setup: excalidraw', setup: true, run: ({ page }) => create(page, 'drawing', { variant: 'Excalidraw' }) },
    clip('excalidraw', async ({ page }) => {
      await page.keyboard.press('r');
      await drag(page, { x: 800, y: 300 }, { x: 1100, y: 500 });
      await page.keyboard.press('o');
      await drag(page, { x: 1250, y: 320 }, { x: 1500, y: 560 });
      await page.keyboard.press('a');
      await drag(page, { x: 1100, y: 400 }, { x: 1250, y: 440 });
      await page.keyboard.press('p');
      await drag(page, { x: 850, y: 700 }, { x: 1450, y: 720 }, 30);
    }),

    { name: 'setup: canvas', setup: true, run: ({ page }) => create(page, 'drawing', { variant: 'Canvas' }) },
    clip('canvas', async ({ page }) => {
      for (const [tool, from, to] of [
        ['R', { x: 750, y: 300 }, { x: 1000, y: 420 }],
        ['E', { x: 1200, y: 300 }, { x: 1450, y: 420 }],
        ['R', { x: 950, y: 600 }, { x: 1250, y: 720 }],
      ]) {
        await page.locator(`[data-testid="palette-${tool}"]`).last().click();
        await drag(page, from, to);
        await page.waitForTimeout(300);
      }
    }),

    // Tasks: an outline and a journal entry.
    { name: 'setup: outline', setup: true, run: ({ page }) => create(page, 'outline') },
    clip('outline', async ({ page }) => {
      await page.locator('.cm-content').last().click();
      await type(page, 'Launch plan\n', 35);
      await page.keyboard.press('Tab');
      await type(page, 'Write the announcement\nRecord the demo\nShip the release\n', 35);
    }),

    { name: 'setup: journal', setup: true, run: ({ page }) => create(page, 'journal') },
    clip('journal', async ({ page }) => {
      await page.locator('.cm-content').last().click();
      await type(page, 'Met with the design team. Agreed on the new grid layout and a slower zoom.\n', 40);
    }),

    // The plugin registry, scrolled.
    {
      name: 'setup: registry',
      setup: true,
      run: async ({ page }) => {
        await page.locator('[data-testid="treeView.pluginRegistry"]').first().click();
        await page.waitForTimeout(2_500);
      },
    },
    clip('registry', async ({ page }) => {
      await page.mouse.move(1270, 600);
      for (let i = 0; i < 40; i++) {
        await page.mouse.wheel(0, 45);
        await page.waitForTimeout(110);
      }
    }),
  ],
};

/** A failed setup is logged, not thrown, so one plugin cannot end the take. */
const guard = (step) =>
  step.name.startsWith('setup: ')
    ? {
        ...step,
        run: (ctx) =>
          Promise.resolve(step.run(ctx)).catch((err) =>
            console.log(`[showcase] FAILED ${step.name}: ${err.message.split('\n')[0]}`),
          ),
      }
    : step;

export const steps = [
  {
    name: 'setup: dismiss notices, close the companion, enable plugins',
    setup: true,
    run: async ({ page }) => {
      const notice = page.locator('[data-testid="toast.close"]');
      if (await visible(notice, 8_000)) {
        await notice.first().click();
      }
      const close = page.locator('role=button[name="Close companion"]');
      if (await visible(close, 1_000)) {
        await close.first().click();
      }
      const result = await page.evaluate(
        (ids) => composer.invoke('org.dxos.operation.registry.enablePlugins', { ids }),
        PLUGINS,
      );
      console.log('[showcase] enable', JSON.stringify(result).slice(0, 300));
      await page.waitForTimeout(2_000);
    },
  },

  ...(process.env.SHOWCASE_BATCH ?? 'one,mermaid,two,three')
    .split(',')
    .flatMap((name) => {
      const batch = BATCHES[name.trim()];
      if (!batch) {
        throw new Error(`unknown SHOWCASE_BATCH "${name}"; expected one of ${Object.keys(BATCHES).join(', ')}`);
      }
      return batch;
    })
    .map(guard),
];
