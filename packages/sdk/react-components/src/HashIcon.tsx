//
// Copyright 2020 DXOS.org
//

import {
  SportsTennis as TennisIcon,
  SportsMotorsports as HelmetIcon,
  SportsBaseball as BallIcon,
  DownhillSkiing as SkiierIcon,
  Train as TrainIcon,
  LocalAirport as PlaneIcon,
  DirectionsCar as CarIcon,
  DirectionsBoat as BoatIcon
} from '@mui/icons-material';
import { Box, colors } from '@mui/material';
import React from 'react';
import hash from 'string-hash';

const hashIcons = [
  [TennisIcon, 'bat'],
  [HelmetIcon, 'helmet'],
  [BallIcon, 'ball'],
  [SkiierIcon, 'skiier'],
  [TrainIcon, 'train'],
  [PlaneIcon, 'plane'],
  [CarIcon, 'car'],
  [BoatIcon, 'boat']
];

const hashColors = [
  [colors.red, 'red'],
  [colors.deepPurple, 'purple'],
  [colors.blue, 'blue'],
  [colors.green, 'green'],
  [colors.orange, 'orange'],
  [colors.brown, 'brown'],
  [colors.blueGrey, 'grey'],
  [colors.cyan, 'cyan']
];

const colorDepth = 500;

/**
 * A stable generic icon based on a hash.
 */
export const HashIcon = ({ value, sx, ...props }: { value: string, sx: any }) => {
  const num = hash(value);
  const icon = hashIcons[num % hashIcons.length];
  const color = hashColors[num % hashColors.length];

  const Icon = icon[0];
  const title = `${color[1]} ${icon[1]}`;

  return (
    <Box title={title}>
      <Icon sx={{ color: color[0][colorDepth], ...sx }} {...props} />
    </Box>
  );
};
