//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Typography } from '@mui/material';

import { CustomTextField } from '../src';
import { Container } from './helpers';

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
            <Box key={size} sx={{ padding: 2 }}>
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
            </Box>
          ))}
        </Box>
      ))}
    </Container>
  );
};
