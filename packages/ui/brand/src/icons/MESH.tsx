//
// Copyright 2023 DXOS.org
//

import { type Icon, IconBase, type IconWeight } from '@phosphor-icons/react';
import React, { forwardRef, type ReactElement } from 'react';

const weights = new Map<IconWeight, ReactElement>([
  [
    'regular',
    <>
      <path d='M65.743,14.645l58.606,227.928l6.777,-1.742l-58.606,-227.929l-6.777,1.743Z' />
      <path d='M127.737,235.515l82.361,-120.117l5.771,3.958l-85.247,124.325l-5.771,-0l-85.244,-124.326l5.772,-3.957l82.358,120.117Z' />
      <path d='M127.738,84.021l55.836,-72.385l6.159,1.266l58.607,227.929l-6.159,3.008l-114.443,-148.361l-114.443,148.361l-6.159,-3.008l58.607,-227.929l6.159,-1.266l55.836,72.385Zm-109.585,142.063l105.166,-136.335l-52.583,-68.167l-52.583,204.502Zm114.004,-136.335l105.166,136.335l-52.583,-204.502l-52.583,68.167Z' />
      <path d='M182.956,12.902l-58.607,227.929l6.777,1.742l58.607,-227.928l-6.777,-1.743Z' />
    </>,
  ],
]);

export const MESH: Icon = forwardRef((props, ref) => <IconBase ref={ref} {...props} weights={weights} />);

MESH.displayName = 'MESH';
