//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Icon from '@dxos/assets/assets/icons/white/icon-dxos.svg';

// TODO(burdon): Factor out.
export const Logo: FC<{ className: string }> = ({ className }) => <img src={Icon} alt='DXOS' className={className} />;
