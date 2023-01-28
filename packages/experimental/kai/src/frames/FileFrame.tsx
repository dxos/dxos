//
// Copyright 2023 DXOS.org
//

import { FilePlus } from 'phosphor-react';
import React from 'react';
import { FileUploader } from 'react-drag-drop-files';

import { getSize } from '@dxos/react-components';

// TODO(burdon): Wildcard?
// https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept
const fileTypes = ['JPG', 'PNG', 'GIF', 'TXT', 'MD', 'PDF'];

export const FileFrame = () => {
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file
  // https://developer.mozilla.org/en-US/docs/Web/API/File
  const handleChange = (file) => {
    console.log(file);
    console.log(file.size);

    // const stream: ReadableStream = file.stream();
  };

  // https://www.npmjs.com/package/react-drag-drop-files
  return (
    <div className='hidden md:flex flex-1 justify-center items-center'>
      <div className='flex w-[300px] h-[300px] justify-center items-center border-4 border-dashed rounded-lg'>
        <FileUploader name='file' types={fileTypes} handleChange={handleChange}>
          <div className='flex justify-center mb-2 cursor-pointer'>
            <FilePlus weight='thin' className={getSize(10)} />
          </div>
          <div>Click or drag files</div>
        </FileUploader>
      </div>
    </div>
  );
};
