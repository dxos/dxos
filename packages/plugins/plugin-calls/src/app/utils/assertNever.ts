//
// Copyright 2024 DXOS.org
//

export default (_value: never, message: string = 'Unhandled type: assert never failed') => {
  throw new Error(message);
};
