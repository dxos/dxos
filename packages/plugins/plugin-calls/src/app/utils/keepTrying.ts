//
// Copyright 2024 DXOS.org
//

export default <T>(fn: () => Promise<T>) => {
  let keepTrying = true;

  const execute = (retryTime = 1000) => {
    fn().catch((error) => {
      console.debug(error);
      setTimeout(() => {
        if (keepTrying) {
          execute(retryTime * 1.5);
        }
      }, retryTime);
    });
  };
  execute();

  return () => {
    keepTrying = false;
  };
};
