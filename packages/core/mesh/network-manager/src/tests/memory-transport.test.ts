//
// Copyright 2021 DXOS.org
//

import { TestBuilder } from '../testing';
import { testSuite } from './test-suite';

describe('Memory transport', function () {
  const testBuilder = new TestBuilder();
  testSuite(testBuilder);
});
