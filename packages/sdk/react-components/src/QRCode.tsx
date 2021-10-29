//
// Copyright 2021 DXOS.org
//

import QRCodeReact from 'qrcode.react';
import React from 'react';

export const QRCode = ({
  value = ''
}: {
  value: string
}) => {
  // https://www.npmjs.com/package/qrcode.react
  return (
    <QRCodeReact
      value={value}
      size={256}
    />
  );
};
