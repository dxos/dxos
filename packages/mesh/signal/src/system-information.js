
/**
 * Copy from https://github.com/dxos/console/tree/master/packages/console-server
 */

//
// Copyright 2021 DXOS.org
//

import { spawnSync } from 'child_process';
import fs from 'fs';
import pick from 'lodash.pick';
import moment from 'moment';
import os from 'os';
import si from 'systeminformation';

const num = new Intl.NumberFormat('en', { maximumSignificantDigits: 3 });

const size = (n, unit) => {
  const units = {
    K: 3,
    M: 6,
    G: 9,
    T: 12
  };

  const power = units[unit] || 0;

  return num.format(Math.round(n / (10 ** power))) + (unit ? ` ${unit}` : '');
};

const getVersionInfo = () => {
  // TODO(telackey): Get from config (or figure out a better way to do this).
  const versionFile = '/opt/kube/VERSION';
  if (fs.existsSync(versionFile)) {
    return fs.readFileSync(versionFile, { encoding: 'UTF8' }).replace(/^\s+|\s+$/g, '');
  }
  return undefined;
};

/**
 * Get system inforamtion.
 * https://www.npmjs.com/package/systeminformation
 */
const getSystemInfo = async () => {
  const ifaces = os.networkInterfaces();
  const addresses = Object.entries(ifaces).reduce((result, [, values]) => {
    values.forEach(({ family, address }) => {
      address = address.toLowerCase();
      // TODO(telackey): Include link-local IPv6?
      if (!address.startsWith('127.') && !address.startsWith('fe80::') && !address.startsWith('::1')) {
        result.push(address);
      }
    });
    return result;
  }, []);

  const cpu = await si.cpu();
  const memory = await si.mem();
  const device = await si.system();
  const hostname = os.hostname();

  return {
    cpu: pick(cpu, 'brand', 'cores', 'manufacturer', 'vendor', 'speed'),

    memory: {
      total: size(memory.total, 'M'),
      free: size(memory.free, 'M'),
      used: size(memory.used, 'M'),
      swaptotal: size(memory.swaptotal, 'M')
    },

    device: pick(device, 'model', 'serial', 'version'),

    network: {
      hostname,
      addresses
    },

    os: {
      arch: os.arch(),
      platform: os.platform(),
      version: os.version ? os.version() : undefined // Node > 13
    },

    time: {
      now: moment(),
      up: moment().subtract(os.uptime(), 'seconds')
    },

    nodejs: {
      version: process.version
    },

    version: getVersionInfo()
  };
};

/**
 * Get system inforamtion.
 * https://www.npmjs.com/package/systeminformation
 */
const getServiceInfo = async () => {
  const command = 'dx';
  const args = ['service', '--json'];

  const child = spawnSync(command, args, { encoding: 'utf8' });
  return JSON.parse(child.stdout);
};

module.exports = { getServiceInfo, getSystemInfo };
