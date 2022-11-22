//
// Copyright 2021 DXOS.org
//

import { TestBuilder } from '../testing';
import { basicTestSuite } from './basic-test-suite';

describe('Memory transport', function () {
  const testBuilder = new TestBuilder();
  basicTestSuite(testBuilder);
});
