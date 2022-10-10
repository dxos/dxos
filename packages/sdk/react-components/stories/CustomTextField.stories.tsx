//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Divider, Typography } from '@mui/material';

import { CustomTextField } from '../src/index.js';
import { Container } from './helpers/index.js';

export default {
  title: 'react-components/CustomTextField',
  component: CustomTextField
};

type Size = 'small' | 'medium' | undefined;
type Variant = 'filled' | 'outlined' | 'standard' | undefined;

const sizes: Size[] = ['small', 'medium'];
const variants: Variant[] = ['standard', 'outlined', 'filled'];

export const Primary = () => {
  const [text, setText] = useState<string>('CustomTextField');

  return (
    <Container>
      {sizes.map(size => (
        <Box key={size}>
          {variants.map(variant => (
            <Box key={variant} sx={{ padding: 2 }}>
              <Typography color='primary' gutterBottom>{size}-{variant}</Typography>
              <CustomTextField
                margin='none'
                size={size}
                variant={variant}
                placeholder='Click to edit (filled)'
                value={text}
                onUpdate={setText}
                clickToEdit
              />
              <Divider />
            </Box>
          ))}
        </Box>
      ))}
    </Container>
  );
};

export const Secondary = () => {
  const [editing, setEditing] = useState(true);

  return (
    <Container>
      <Box>
        <CustomTextField
          autoFocus
          clickToEdit
          variant='standard'
          editing={editing}
          value='Test'
        />
      </Box>
      <Box sx={{ padding: 2 }}>
        <Button onClick={() => setEditing(!editing)}>
          Toggle
        </Button>
      </Box>
    </Container>
  );
};
