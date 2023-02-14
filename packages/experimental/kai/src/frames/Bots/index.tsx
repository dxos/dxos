import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';
import React, { useState } from 'react'
import { useEffect } from 'react';

export const BotsFrame = () => {
  const [resp, setResp] = useState({})

  useEffect(() => {

    // https://docs.docker.com/engine/api/v1.42/
    fetch('https://cors-anywhere.herokuapp.com/' + 'http://198.211.114.136:4243/containers/json')
      .then(r => r.json())
      .then(r => setResp(r))
  }, [])

  return (
    <SyntaxHighlighter className='w-full' language='json' style={style}>
      {JSON.stringify(resp, undefined, 2)}
    </SyntaxHighlighter>
  )
}

export default BotsFrame;