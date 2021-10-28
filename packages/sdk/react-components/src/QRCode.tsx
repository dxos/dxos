//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { useQRCode } from 'react-qrcodes';

export const QRCode = ({
  text = '',
  options = {}
}: {
  text?: string,
  options?: {}
}) => {
  const [inputRef] = useQRCode({ text, options });
  return (
    <canvas ref={inputRef as React.MutableRefObject<any>} />
  );
};
