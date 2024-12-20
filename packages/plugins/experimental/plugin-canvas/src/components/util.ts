//
// Copyright 2024 DXOS.org
//

export type TestId =
  | 'dx-storybook'
  | 'dx-editor'
  | 'dx-canvas'
  | 'dx-layout'
  | 'dx-canvas-grid'
  | 'dx-background'
  | 'dx-overlays'
  | 'dx-ui';

let logged = false;

export const testId = (id: TestId, inspect = false) => {
  if (inspect) {
    if (!logged) {
      // eslint-disable-next-line no-console
      console.log('Open storybook in expanded window;\nthen run INSPECT()');
      logged = true;
    }

    (window as any).INSPECT = () => {
      const el = document.querySelector(`[data-test-id="${id}"]`);
      (window as any).inspect(el);
      // eslint-disable-next-line no-console
      console.log(el);
    };
  }

  return { 'data-test-id': id };
};
