//
// Copyright 2024 DXOS.org
//

let logged = false;

/**
 * Get the relative point of the cursor.
 * NOTE: ev.offset returns the position relative to the target.
 */
export const getRelativePoint = (el: HTMLElement, ev: MouseEvent) => {
  const rect = el.getBoundingClientRect();
  return { x: ev.clientX - rect.x, y: ev.clientY - rect.top };
};

/**
 *
 */
// TODO(burdon): Factor out.
export const testId = <ID = string>(id: ID, inspect = false) => {
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

  return { [DATA_TEST_ID]: id };
};

export const DATA_TEST_ID = 'data-test-id';
