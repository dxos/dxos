import 'setimmediate';
import React from 'react';

import BrowserOnly from '@docusaurus/BrowserOnly';
import Layout from '@theme/Layout';

import { 
  Box,
  Button
} from '@mui/material';

import { ShowcaseCard } from '../components';

const DXNS_SERVER = 'wss://node1.devnet.dxos.network/dxns/ws';

const Constants = {
  TITLE: 'DXOS Showcase',
  DESCRIPTION: 'List of apps & frames people are building with DXOS',
  EDIT_URL: 'https://github.com/dxos/web/edit/main/packages/docs/src/data/showcase.ts'
}

const ShowcaseList = () => {
  const { useShowcaseDemos } = require('../hooks');
  const demos = useShowcaseDemos();

  return (
    <>
      {demos.map(data => (
        <Box
          key={data.id}
          className='col col--3 margin-bottom--md'
          sx={{
            display: 'flex',
            flex: 1
          }} 
        >
          <ShowcaseCard data={data} />
        </Box>
      ))}
    </>
  );
};

// TODO(zarco): use ThemeProvider to normalize buttons and primary colors.
const Showcase = () => {
  return (
    <Layout title={Constants.TITLE} description={Constants.DESCRIPTION}>
      <main>
        <Box sx={{
          backgroundColor: '#1d1f20',
          paddingTop: 10,
          paddingBottom: 10,
          color: 'white'
        }}>
          <Box className='container'>
              <h1>{Constants.TITLE}</h1>
              <p>{Constants.DESCRIPTION}</p>
              {/* TODO: Define how the button should work. */}
              {/* <Button variant='outlined' href={Constants.EDIT_URL}>
                Join us by adding your site!
              </Button> */}
          </Box>
        </Box>
        <Box className='container margin-vert--lg'>
          <Box className='row'>
            <BrowserOnly fallback={<div>Loading...</div>}>
              {() => {
                const { RegistryInitializer } = require('@dxos/react-registry-client');

                return (
                  <RegistryInitializer config={{ services: { dxns: { server: DXNS_SERVER } } }}>
                    <ShowcaseList />
                  </RegistryInitializer>
                );
              }}
            </BrowserOnly>
          </Box>
        </Box>
      </main>
    </Layout>
  );
};

export default Showcase;
