#!/bin/bash
TIMESTAMP=`date "+%Y%m%d-%H%M%S"`
pnpm run agent start --verbose --config ./config/config.yml --spec ./config/spec-test-${GRAVITY_TEST_SCENARIO}.yml 2>&1 | tee /tmp/gravity-results/gravity.${GRAVITY_TEST_SCENARIO}.${TIMESTAMP}.${$}.log