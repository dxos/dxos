const { REACT_APP_SWARM_SIGNAL } = process.env;

const config = {
  app: {
    title: 'Tasks App',
  },
  storage: {
    persistent: true,
  },
  swarm: {
    signal: REACT_APP_SWARM_SIGNAL,
  },
};

export default config;
