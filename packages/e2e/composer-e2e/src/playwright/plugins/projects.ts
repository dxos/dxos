//
// Copyright 2026 DXOS.org
//

import { type Locator } from '@playwright/test';

export const Projects = {
  getOutlineTextboxWithLocator: (locator: Locator) =>
    locator.getByTestId('projectsPlugin.outline').getByRole('textbox'),
};
