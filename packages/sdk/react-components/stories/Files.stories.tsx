//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, TextField } from '@mui/material';

import { FileUploadDialog, useFileDownload } from '../src/index.js';

export default {
  title: 'react-components/Files'
};

export const Primary = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [data, setData] = useState('Hello World');
  const download = useFileDownload();

  const handleClose = () => setShowUpload(false);

  const handleUpload = async (files: File[]) => {
    if (files.length) {
      // https://developer.mozilla.org/en-US/docs/Web/API/TextDecoder
      const data = await files[0].arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      setData(decoder.decode(data));
    }
  };

  const handleDownload = () => {
    // https://developer.mozilla.org/en-US/docs/Glossary/MIME_type
    download(new Blob([data], { type: 'text/plain' }), 'test.txt');
  };

  return (
    <Box>
      <FileUploadDialog
        open={showUpload}
        onClose={handleClose}
        onUpload={handleUpload}
      />

      <Box sx={{ margin: 2 }}>
        <Button onClick={() => setShowUpload(true)}>
          Upload
        </Button>
        <Button onClick={handleDownload}>
          Download
        </Button>
      </Box>

      <Box sx={{ margin: 2 }}>
        <TextField
          autoFocus
          fullWidth
          value={data}
          onChange={event => setData(event.target.value)}
        />
      </Box>
    </Box>
  );
};
