import React, { useState } from 'react';

export type RunPanelProps = {
  functionUrl?: string;
};

export const RunPanel = ({ functionUrl }: RunPanelProps) => {
  const [body, setBody] = useState('');
  const [result, setResult] = useState('');

  const onRun = async () => {
    setResult('');
    fetch(functionUrl!, {
      method: 'POST',
      body,
    })
      // Retrieve its body as ReadableStream
      .then((response) => {
        const reader = response.body!.getReader();
        // read() returns a promise that resolves when a value has been received
        reader.read().then(async function pump({ done, value }): Promise<void> {
          if (done) {
            // Do something with last chunk of data then exit reader
            return;
          }
          // Otherwise do something here to process current chunk
          setResult((result) => result + new TextDecoder().decode(value));

          // Read some more, and call this function again
          return reader.read().then(pump);
        });
      })
      .catch((err) => console.error(err));
  };

  return (
    <div className='h-full'>
      <div>{functionUrl}</div>
      <input type='text' value={body} onChange={(e) => setBody(e.target.value)} />
      <button onClick={onRun}>Run</button>
      <div className='whitespace-pre-wrap'>{result}</div>
    </div>
  );
};
