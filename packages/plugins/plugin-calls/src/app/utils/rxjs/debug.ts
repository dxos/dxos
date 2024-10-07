//
// Copyright 2024 DXOS.org
//

import { tap } from 'rxjs';

export const debugTap = <T>(message: string) =>
  tap<T>({
    next: (...args) => console.log(message, ...args),
    complete: () => console.log('COMPLETED ', message),
  });
