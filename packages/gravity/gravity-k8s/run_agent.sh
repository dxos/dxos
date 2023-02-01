#!/bin/bash
TIMESTAMP=`date "+%Y%m%d-%H%M%S"`

cp ./config/config-${GRAVITY_TEST_SCENARIO}.yml ./config/config.yml
mkdir -p /tmp/dxos
export LOG_FILE=/tmp/dxos/gravity-${GRAVITY_TEST_SCENARIO}.${TIMESTAMP}.${$}.log
chmod a+x /opt/filebeat-8.5.3-linux-x86_64/filebeat
cd /opt/filebeat-8.5.3-linux-x86_64
nohup ./filebeat &
cd /dxos/dxos/packages/gravity/gravity-agent
pnpm run agent start --verbose --config ./config/config.yml --spec ./config/spec-test-${GRAVITY_TEST_SCENARIO}.yml 2>&1 | tee /tmp/gravity-results/gravity.${GRAVITY_TEST_SCENARIO}.${TIMESTAMP}.${$}.log