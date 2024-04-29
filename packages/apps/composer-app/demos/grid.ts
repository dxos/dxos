//
// Copyright 2022 DXOS.org
//

import { chromium } from '@playwright/test';
import robot from 'robotjs'; // TODO(burdon): Abandoned.

import { sleep } from '@dxos/async';
import { log } from '@dxos/log';

import { Grid, Launcher } from './util';

/**
 * Environment variables.
 */
const config = {
  // TODO(burdon): Configure based on vite config.
  baseUrl: process.env.TEST_BASEURL ?? 'http://localhost:5173/#/',
  // TEST_GRID=[rows,columns]
  dimensions: process.env.TEST_GRID?.split(',').map((i) => parseInt(i)) ?? [1, 2],
  // TEST_MINSIZE=[width,height]
  minSize: process.env.TEST_MINSIZE?.split(',').map((i) => parseInt(i)) ?? [750, 500],
  // Menubar with OSX notch is 40.
  // TODO(burdon): Detect OS.
  margin: parseInt(process.env.TEST_MARGIN ?? '24'),
  spacing: parseInt(process.env.TEST_SPACING ?? '8'),
};

/**
 * Create grid of launchers.
 */
// TODO(burdon): Test invitation flow.
const createLaunchers = () => {
  const { width, height } = robot.getScreenSize();
  const grid = new Grid(width, height, config.spacing, config.margin);
  // @ts-ignore
  const [rows, columns] = config.dimensions ?? grid.createDimensions(...config.minSize);
  return grid.createGrid(rows, columns).map(
    (bounds) =>
      new Launcher(config.baseUrl, chromium, {
        headless: false,
        args: Launcher.createPositionalArgs(bounds),
      }),
  );
};

const test = async () => {
  const launchers = createLaunchers();
  log.info('Starting...', { launchers: launchers.length });

  await Promise.all(
    launchers.map(async (launcher) => {
      await launcher.open();
      await launcher.page.goto(launcher.url('/'));
    }),
  );

  // afterTest(async () => {
  //   console.log('Stopping...');
  //   await Promise.all(launchers.map((launcher) => launcher.close()));
  // });

  // TODO(burdon): State machine/actions.
  await sleep(10_000);
  log.info('Done');
};

void test();
