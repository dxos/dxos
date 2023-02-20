import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';
import React, { useState } from 'react'
import { useEffect } from 'react';
import { PublicKey } from '@dxos/keys';
import { sleep } from '@dxos/async';

// const DOCKER_URL = 'https://cors-anywhere.herokuapp.com/' + 'http://198.211.114.136:4243';

// socat -d TCP-LISTEN:2376,range=127.0.0.1/32,reuseaddr,fork UNIX:/var/run/docker.sock
// cors-http-proxy -t http://localhost:2376 -p 2377
const DOCKER_URL = 'http://localhost:2377';

export const BotsFrame = () => {
  const [resp, setResp] = useState({})
  const [status, setStatus] = useState('')

  const refresh = () => {
    // https://docs.docker.com/engine/api/v1.42/
    fetch(`${DOCKER_URL}/containers/json?all=true`)
      .then(r => r.json())
      .then(r => setResp(r))
  }

  useEffect(() => {
    refresh()
  }, [])

  const addBot = async () => {
    setStatus('Creating container...')
    const name = 'kai-bot-' + PublicKey.random().toHex().slice(0, 8)
    const port = Math.floor(Math.random() * 1000) + 3000
    const res = await fetch(`${DOCKER_URL}/containers/create?name=${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Image: 'nginx',
        ExposedPorts: {
          '80/tcp': {},
        },
        HostConfig: {
          PortBindings: {
            '80/tcp': [
              {
                HostPort: `${port}`,
              },
            ],
          },
        },
        Labels: {
          'dxos.bot': `${true}`,
          'dxos.bot.dxrpc-port': `${port}`,
        }
      }),
    })
    const data = await res.json()
    console.log(data)
    refresh()
    setStatus('Starting container...')
    await fetch(`${DOCKER_URL}/containers/${data.Id}/start`, {
      method: 'POST',
    })
    refresh()
    setStatus('Waiting for bot to start...')
    // while(true) {
    //   try {
    //     await fetch(`http://localhost:${port}/`)
    //     break
    //   } catch (err) {
    //     console.log(err)
    //   }
    //   await sleep(500)
    // }
    setStatus('Connecting to bot...')

    refresh()
  }

  return (
    <div>
      <div className="flex">
        <button onClick={refresh} className="inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out">Refresh</button>
        <button onClick={addBot} className="inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out">Add bot</button>
        <div>{status}</div>
      </div>
      <SyntaxHighlighter className='w-full' language='json' style={style}>
        {JSON.stringify(resp, undefined, 2)}
      </SyntaxHighlighter>
    </div>
  )
}

export default BotsFrame;