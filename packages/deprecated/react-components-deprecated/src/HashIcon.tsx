//
// Copyright 2020 DXOS.org
//

import React from 'react';
import hash from 'string-hash';

import {
  // Sport.
  SportsTennis as TennisIcon,
  SportsMotorsports as HelmetIcon,
  SportsBaseball as BallIcon,
  DownhillSkiing as SkiierIcon,

  // Transport.
  Train as TrainIcon,
  LocalAirport as PlaneIcon,
  DirectionsCar as CarIcon,
  DirectionsBoat as BoatIcon,
  DeliveryDining as ScooterIcon,
  AirportShuttle as BusIcon,

  // Food.
  LocalBar as GlassIcon,
  Cake as CakeIcon,
  RamenDining as NoodlesIcon,

  // Things.
  Agriculture as FarmIcon,
  LocalFlorist as FlowerIcon,
  BeachAccess as Umbrella
} from '@mui/icons-material';
import { colors } from '@mui/material';

// https://mui.com/components/material-icons
const hashIcons = [
  [TennisIcon, 'bat'],
  [HelmetIcon, 'helmet'],
  [BallIcon, 'ball'],
  [SkiierIcon, 'skiier'],
  [TrainIcon, 'train'],
  [PlaneIcon, 'plane'],
  [CarIcon, 'car'],
  [BoatIcon, 'boat'],
  [ScooterIcon, 'scooter'],
  [BusIcon, 'bus'],
  [GlassIcon, 'glass'],
  [CakeIcon, 'cake'],
  [NoodlesIcon, 'noodles'],
  [FarmIcon, 'farm'],
  [FlowerIcon, 'flower'],
  [Umbrella, 'umbrella']
];

// https://mui.com/customization/color/#color-palette
const hashColors = [
  [colors.red, 'red'],
  [colors.pink, 'pink'],
  [colors.purple, 'purple'],
  [colors.blue, 'blue'],
  [colors.green, 'green'],
  [colors.orange, 'orange'],
  [colors.brown, 'brown']
];

const colorDepth = 500;

type Size = 'small' | 'medium' | 'large';

const sizes = {
  small: {
    width: 16,
    height: 16
  },
  medium: {
    width: 24,
    height: 24
  },
  large: {
    width: 32,
    height: 32
  }
};

/**
 * A stable generic icon based on a hash.
 */
export const HashIcon = ({ value, sx, size = 'medium', ...props }: { value: string; sx?: any; size?: Size }) => {
  const icon = hashIcons[hash(value) % hashIcons.length];
  const color = hashColors[hash(value) % hashColors.length];

  const Icon = icon[0];
  const title = `${color[1]}-${icon[1]}`;

  return (
    <div style={{ display: 'flex' }} title={title}>
      <Icon sx={{ color: color[0][colorDepth], ...sizes[size], ...sx }} {...props} />
    </div>
  );
};
