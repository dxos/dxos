//
// Copyright 2021 DXOS.org
//

import React, { useState, useEffect } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { IconButton, Tooltip } from '@material-ui/core';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';

interface CopyButtonProps {
  text: string
}

/**
 * @deprecated Use react-components.
 */
const CopyButton = ({ text } : CopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const [clearTimer, setClearTimer] = useState<NodeJS.Timeout | undefined>();

  const handleCopy = () => {
    setIsCopied(true);
    clearTimer && clearTimeout(clearTimer);
    setClearTimer(setTimeout(() => setIsCopied(false), 2000));
  };

  useEffect(() => {
    return () => {
      clearTimer && clearTimeout(clearTimer);
    };
  }, []);

  return (
    <Tooltip title={isCopied ? 'Copied!' : 'Copy to clipboard'} arrow>
      <IconButton>
        <CopyToClipboard text={text} onCopy={handleCopy}>
          <FileCopyOutlinedIcon fontSize='small' />
        </CopyToClipboard>
      </IconButton>
    </Tooltip>
  );
};

export default CopyButton;
