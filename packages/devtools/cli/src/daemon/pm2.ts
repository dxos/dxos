import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import pm2 from 'pm2';

type Pm2Params = {
  cwd?: string; // * @param {String}  [opts.cwd=<current>]         override pm2 cwd for starting scripts
  pm2_home?: string; // * @param {String}  [opts.pm2_home=[<paths.js>]] pm2 directory for log, pids, socket files
  independent?: boolean; // * @param {Boolean} [opts.independent=false]     unique PM2 instance (random pm2_home)
  daemon_mode?: boolean; // * @param {Boolean} [opts.daemon_mode=true]      should be called in the same process or not
  public_key?: string; // * @param {String}  [opts.public_key=null]       pm2 plus bucket public key
  secret_key?: string; // * @param {String}  [opts.secret_key=null]       pm2 plus bucket secret key
  machine_name?: string; // * @param {String}  [opts.machine_name=null]     pm2 plus instance name
}

const Pm2Api: new (params?: Pm2Params) => typeof pm2 = (pm2 as any).custom;

export const getPm2 = async () => {
  const instance = new Pm2Api({
    pm2_home: `${process.env.HOME}/.dx/store/pm2`,
  });

  const connected = new Trigger();
  instance.connect(err => {
    if(err) {
      connected.throw(err)
    } else {
      connected.wake();
    }
  });

  log.info('Waiting for PM2 to connect...');
  await connected;
  log.info('PM2 connected.');

  return instance;
}
