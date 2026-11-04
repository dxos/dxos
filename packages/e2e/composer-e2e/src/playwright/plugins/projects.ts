//
// Copyright 2026 DXOS.org
//

import { type Locator } from '@playwright/test';

export const Projects = {
  /** The editor of the outline on a project's Overview. */
  getOutlineTextboxWithLocator: (locator: Locator) =>
    locator.getByTestId('projectsPlugin.outline').getByRole('textbox'),
};
