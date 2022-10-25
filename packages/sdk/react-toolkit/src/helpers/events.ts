//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Move to react-components?
export const handleKey =
  (key: string, callback: () => void) => (event: { key: string }) => {
    if (event.key === key) {
      callback();
    }
  };
