import wtf from 'wtfnode'



type MochaHooks = {
  afterAll: () => Promise<void>;
};

export const mochaHooks: MochaHooks = {
  async afterAll() {
    setTimeout(() => {
      wtf.dump()
    }, 1000)
  }
};