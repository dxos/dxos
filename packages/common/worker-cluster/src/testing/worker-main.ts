import { WorkerServer } from '../worker';

const server = new WorkerServer({
  onMainInitialized: (ev) => {
    console.log('main initialized', ev);
  },
  onPageConnected: (ev) => {
    console.log('page connected', ev);
  },
  onPageDisconnected: (ev) => {
    console.log('page disconnected', ev);
  },
  onAuxiliaryInitialized: (ev) => {
    console.log('auxiliary initialized', ev);
  },
});

server.init();
