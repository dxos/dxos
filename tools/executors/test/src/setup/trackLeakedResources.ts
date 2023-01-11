import wtf from 'wtfnode'



type MochaHooks = {
  afterAll: () => Promise<void>;
};

export const mochaHooks: MochaHooks = {
  async afterAll() {
    setTimeout(() => {
      (global as any).dxDumpLeaks?.()
      console.log('\n\n');
      wtf.dump()
    }, 1000)
  }
};