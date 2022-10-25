//
// Copyright 2021 DXOS.org
//

import QRCodeReact from 'qrcode.react';
import React from 'react';

export const QRCode = ({ value = '' }: { value: string }) => (
  <QRCodeReact value={value} size={256} />
);
