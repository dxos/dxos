//
// Copyright 2021 DXOS.org
//

// import { expect, test } from '@playwright/test';

// import { setupPage } from '@dxos/test-utils/playwright';

// import { StackManager } from '../testing';

// // TODO(wittjosiah): Factor out.
// const storybookUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

// // TODO(wittjosiah): Update for new stack.
// test.describe.skip('Stack', () => {
//   test('remove', async ({ browser }) => {
//     const { page } = await setupPage(browser, { url: storybookUrl('ui-react-ui-stack-stack--transfer') });
//     await page.getByTestId('stack-transfer').waitFor({ state: 'visible' });

//     const stack = new StackManager(page.getByTestId('stack-1'));
//     await expect(stack.sections()).toHaveCount(8);

//     await stack.section(0).remove();
//     await expect(stack.sections()).toHaveCount(7);

//     await page.close();
//   });
// });
