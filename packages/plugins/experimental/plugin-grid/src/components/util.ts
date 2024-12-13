//
// Copyright 2024 DXOS.org
//

const DATA_TEST_ID = 'data-test-id';

export type TestId = 'editor' | 'canvas' | 'grid' | 'background' | 'layer' | 'ui';

export const testId = (id: TestId) => ({ [DATA_TEST_ID]: id });
