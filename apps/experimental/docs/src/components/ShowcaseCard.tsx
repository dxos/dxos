import React from 'react';

import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Button,
  Typography,
  CardActionArea,
  Chip,
  Stack
} from '@mui/material';
import { ShowcaseDemo } from "../hooks";


export const ShowcaseCard = ({ data }: { data: ShowcaseDemo }) => {
  return (
    <Card 
      variant='outlined'
      sx={{
        flex: 1,
        borderRadius: 0,
        '& .MuiCardActionArea-root:hover': {
          color: 'inherit',
          textDecoration: 'none'
        }
      }}
    >
      <CardActionArea
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          flex: 1,
          minHeight: '100%',
        }} 
        LinkComponent='a'
        href={data.location}
        target='_blank'
      >
        <Box>
          {/* TODO(zarco): Use Image Fallback package to use a default image. */}
          {/* 300x160 aspect ratio */}
          <CardMedia
            component="img"
            width="300"
            height="160"
            image={data.image}
            alt="DXOS Logo"
          />
        </Box>
        <CardContent>
          <Typography variant='h5' component='div'>
            {data.title}
          </Typography>
          {data.description && (
            <Typography sx={{ marginBottom: 1.5 }} color='text.secondary'>
              {data.description}
            </Typography>
          )}
          {/* {data.tags && (
            <Stack sx={{ marginTop: 2 }} direction="row" spacing={1}>
              {data.tags.map((tag) => (
                <Chip key={tag} label={tag} variant='outlined' />
              ))}
            </Stack>
          )} */}
        </CardContent>
        <Box sx={{ flex: 1 }} />
        {/* TODO(zarco): Tags and actions on the same line. */}
        <CardActions>
          {data.location && (<Button size='small'>LAUNCH</Button>)}
        </CardActions>
      </CardActionArea>
    </Card>
  );
};
