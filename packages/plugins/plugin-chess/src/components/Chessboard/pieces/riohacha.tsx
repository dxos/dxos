//
// Copyright 2023 DXOS.org
//

import React, { type ReactNode } from 'react';

const style = {
  white: { c1: '#f8f8f8', c2: '#d3d3d3' },
  black: { c1: '#565252', c2: '#444242' },
};

/**
 * From lichess.
 * Select pieces from settings.
 * Inspect pieces; hover over background-image CSS (data URL); open image in new tab; inspect image and copy SVG HTML.
 */
const pieces: Record<string, (style: any) => ReactNode> = {
  p: (style) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='535 1350 1333 1333'>
      <path
        d='M820 2500v-99l87-3 87-3 56-182 57-182-30-28c-62-58-82-147-51-221 52-126 211-166 311-79 91 80 96 207 12 290l-39 39 58 182 58 181 82 3 82 3v199H820z'
        fill={style.c1}
      />
      <path
        d='M1590 2500v-99l-82-3-82-3-58-181-58-182 39-39c38-38 61-91 61-144 0-30-19-89-29-89-3 0-65 59-136 130-84 84-135 128-145 125-17-6-22-10 77 68l60 48 12 117c16 154 15 152 57 152h34v200h250z'
        fill={style.c2}
      />
      <path
        d='M1340 2500v-100h-34c-42 0-41 2-57-152l-12-117-64-51-63-51-10 26c-6 15-10 31-10 38 0 11-24 87-75 237l-23 65-86 3-86 3v199h520zm-91-614l133-134-41-40c-55-53-117-68-190-47-113 34-170 176-115 287 13 25 59 68 73 68 3 0 66-60 140-134z'
        fill={style.c1}
      />
      <path
        d='M820 2500v-99l87-3 87-3 56-182 57-182-30-28c-62-58-82-147-51-221 52-126 211-166 311-79 91 80 96 207 12 290l-39 39 58 182 58 181 82 3 82 3v199H820z'
        fill='none'
        stroke='#000'
        strokeWidth='24'
      />
    </svg>
  ),
  r: (style) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='1670 1350 1333 1333'>
      <path
        d='M1940 2500v-99l62-3 63-3 22-210c30-287 33-256-37-299l-60-38 2-161 3-162 57-3 58-3v101h109l3-47 3-48h190l3 48 3 47h109v-101l57 3 58 3 3 163 2 162-46 28c-25 15-52 32-60 37-12 9-11 39 6 215 11 113 23 220 26 238l5 32h129v200h-770z'
        fill={style.c1}
      />
      <g fill={style.c2}>
        <path d='M2710 2500v-100h-129l-5-32c-3-18-15-125-26-238-17-176-18-206-6-215 8-5 35-22 60-37l46-28-2-162-3-163-58-3-57-3v51c0 49-1 50-30 50h-30v230h-238l-237 1 54 34c30 19 57 38 60 42 3 5 12 9 18 10 7 2 65 35 128 74l115 71 1 51c1 29 4 99 8 157l6 105 37 3 38 3v199h250z' />
        <path d='M2418 1573l-3-48-50-3-50-3 3 51 4 50h99z' />
      </g>
      <path
        d='M2460 2501v-100l-38-3-37-3-6-105c-4-58-7-128-8-157l-1-51-122-76c-68-41-126-72-130-68-3 4-9 39-13 77-4 39-8 86-10 105-7 68-14 146-19 203-3 32-8 63-11 68-4 5-33 9-66 9h-59v200h520zm10-766v-115h-149l-3-47-3-48h-90l-3 48-3 47h-109v-101l-58 3-57 3-3 163-2 162h480z'
        fill={style.c1}
      />
      <path
        d='M1940 2500v-99l62-3 63-3 22-210c30-287 33-256-37-299l-60-38 2-161 3-162 57-3 58-3v101h109l3-47 3-48h190l3 48 3 47h109v-101l57 3 58 3 3 163 2 162-46 28c-25 15-52 32-60 37-12 9-11 39 6 215 11 113 23 220 26 238l5 32h129v200h-770z'
        fill='none'
        stroke='#000'
        strokeWidth='24'
      />
    </svg>
  ),
  n: (style) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='2780 1350 1333 1333'>
      <path
        d='M3060 2500v-99l106-3 106-3-82-69-82-69 168-168 167-167-26-16c-43-29-91-31-141-6-25 12-46 26-46 31 0 22-22 5-67-53-28-35-53-68-57-75-4-8 66-61 212-159l220-146 42 22c190 97 273 340 183 531-16 35-39 75-51 89l-21 25 45 46 45 46-82 69-81 69 106 3 106 3v199h-770z'
        fill={style.c1}
      />
      <g fill={style.c2}>
        <path d='M3830 2500v-99l-106-3-106-3 81-69 82-69-45-46-45-46 21-25c12-14 35-54 51-89 55-116 47-264-19-377-31-52-108-126-162-153-53-27-62-27-26 2 46 35 73 68 103 127 124 239-6 525-267 591-35 8-63 17-64 20-1 2 9 34 21 72l23 67h158v200h300z' />
        <path d='M3540 1923v-97l-48 47c-40 39-50 45-62 35-13-11-13-11-2 2 10 12 4 22-35 62l-47 48h194z' />
      </g>
      <path
        d='M3530 2500v-100h-158l-21-62c-12-35-21-67-21-72-1-5 27-17 62-25 261-66 390-350 268-591-27-52-103-140-122-140-12 0-428 279-428 287 0 6 74 106 101 137 5 5 16 0 26-11 37-43 126-55 178-23l30 18 47-46 48-46v194h-195l-115 115-114 114 20 23c10 13 25 27 33 32 7 4 30 24 49 42 20 19 40 34 44 34s8 5 8 10c0 6-42 10-105 10h-105v200h470z'
        fill={style.c1}
      />
      <path
        d='M3060 2500v-99l106-3 106-3-82-69-82-69 168-168 167-167-26-16c-43-29-91-31-141-6-25 12-46 26-46 31 0 22-22 5-67-53-28-35-53-68-57-75-4-8 66-61 212-159l220-146 42 22c190 97 273 340 183 531-16 35-39 75-51 89l-21 25 45 46 45 46-82 69-81 69 106 3 106 3v199h-770z'
        fill='none'
        stroke='#000'
        strokeWidth='24'
      />
    </svg>
  ),
  b: (style) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='3890 1350 1330 1330'>
      <path
        d='M4180 2500v-100h186l38-162c21-90 40-168 43-174 2-6-30-54-72-107-41-54-75-102-75-108s21-38 47-71l47-61 26 31 27 32 32-45 32-45-20-29c-12-16-21-32-21-36 0-10 92-125 99-125 3 1 37 42 76 93 38 50 99 128 133 174l64 82-78 101-78 101 32 137c18 75 37 154 43 175l10 37h179v200h-770z'
        fill={style.c1}
      />
      <path
        d='M4950 2500v-100h-179l-10-37c-6-21-25-100-43-175l-32-137 77-100c42-55 77-101 77-103s-54-1-119 2l-119 5-72 93c-39 50-74 92-78 92s-8 11-8 25c-1 14 2 25 6 25 5 0 38 18 74 41l64 40 7 97c9 134 8 132 61 132h44v200h250zm-422-699c18-22 32-43 32-48 0-4-10-21-23-37l-23-29-36 49-36 48 21 28c11 15 24 28 27 28 4 0 21-18 38-39z'
        fill={style.c2}
      />
      <path
        d='M4700 2500v-100h-44c-53 0-52 2-61-132l-7-97-64-40c-36-23-69-41-73-41-7 0-20 46-63 223l-21 87h-187v200h520zm-168-555l73-95h112c62 0 113-3 112-7 0-9-31-50-157-208-50-64-92-121-92-126 0-20-18-5-63 56l-48 64 45 58c25 32 46 62 46 66 0 11-61 87-70 87-4 0-26-27-50-60-24-32-46-57-51-55-4 3-26 33-49 66l-41 61 47 61c27 34 60 77 74 94 14 18 28 33 32 33s40-43 80-95z'
        fill={style.c1}
      />
      <path
        d='M4180 2500v-100h186l38-162c21-90 40-168 43-174 2-6-30-54-72-107-41-54-75-102-75-108s21-38 47-71l47-61 26 31 27 32 32-45 32-45-20-29c-12-16-21-32-21-36 0-10 92-125 99-125 3 1 37 42 76 93 38 50 99 128 133 174l64 82-78 101-78 101 32 137c18 75 37 154 43 175l10 37h179v200h-770z'
        fill='none'
        stroke='#000'
        strokeWidth='24'
      />
    </svg>
  ),
  q: (style) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='5010 1350 1333 1333'>
      <path
        d='M5300 2500v-100h178l10-47c6-27 18-86 27-133l17-85-107-233c-59-128-105-235-103-237 2-3 24 1 49 8 43 12 44 14 47 58 3 40 10 54 62 110l59 64 1-94c0-89-2-97-26-122l-27-28 23-61c12-33 25-60 29-60s26 20 50 44l42 43-15 36c-14 35-13 39 22 121 20 48 39 86 43 86 3 0 22-39 42-86 35-83 36-87 22-122l-16-36 43-43c23-24 45-43 49-43 7 0 49 97 49 115 0 6-11 22-25 35-23 22-25 30-25 122v99l60-68c54-60 60-72 60-110 0-47 6-52 77-67l32-7-110 238-110 238 16 85c9 47 21 106 27 133l10 47h178v200h-760z'
        fill={style.c1}
      />
      <g fill={style.c2}>
        <path d='M6060 2500v-100h-178l-10-47c-6-27-18-86-27-133l-16-85 110-238 110-238-32 7c-71 15-77 20-77 67 0 38-6 50-60 110l-60 68v-99c0-92 2-100 25-122 14-13 25-29 25-35 0-22-42-115-52-115-5 0-7 4-4 8 3 5-22 134-54 288-33 153-60 282-60 286 0 5-38 8-85 8-67 0-85 3-85 14 0 8-3 23-6 33-4 12-3 14 3 5 7-9 30 1 94 40l84 53 3 63 3 62h109v200h240z' />
        <path d='M5640 1992c0-7 11-35 25-64 14-28 21-54 16-57-4-3-24-43-44-89-35-80-35-84-21-119l15-36-42-43c-24-24-46-44-49-44-8 0 83 447 93 456 4 4 7 2 7-4z' />
      </g>
      <path
        d='M5820 2500v-100h-109l-3-62-3-63-84-53c-61-38-87-49-92-40-3 7-12 42-18 78-7 36-17 82-23 103l-11 37h-177v200h520zm-120-378c0-4 27-133 60-287 33-153 57-281 54-284-2-3-23 13-45 35l-40 40 16 39c14 31 14 43 4 64-12 26-29 65-47 111-5 14-22 51-36 83s-26 63-26 70c-1 40-23-44-60-230-24-117-47-210-51-207-5 3-9 13-9 23 0 9-4 21-9 27-22 24-21 61 4 84 23 22 25 30 25 117 0 51-4 93-8 93-5 0-24-19-42-42-19-24-42-49-52-56-13-9-18-26-18-57 0-24-6-47-13-52-19-12-81-33-85-28-3 2 8 30 23 62 83 177 126 272 159 346l25 57h85c48 0 86-3 86-8z'
        fill={style.c1}
      />
      <path
        d='M5300 2500v-100h178l10-47c6-27 18-86 27-133l17-85-107-233c-59-128-105-235-103-237 2-3 24 1 49 8 43 12 44 14 47 58 3 40 10 54 62 110l59 64 1-94c0-89-2-97-26-122l-27-28 23-61c12-33 25-60 29-60s26 20 50 44l42 43-15 36c-14 35-13 39 22 121 20 48 39 86 43 86 3 0 22-39 42-86 35-83 36-87 22-122l-16-36 43-43c23-24 45-43 49-43 7 0 49 97 49 115 0 6-11 22-25 35-23 22-25 30-25 122v99l60-68c54-60 60-72 60-110 0-47 6-52 77-67l32-7-110 238-110 238 16 85c9 47 21 106 27 133l10 47h178v200h-760z'
        fill='none'
        stroke='#000'
        strokeWidth='24'
      />
    </svg>
  ),
  k: (style) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='6150 1350 1333 1333'>
      <path
        d='M6430 2500v-100h237l17-57 16-58-72-153-72-154 24-19c58-44 130-63 240-64 98 0 109 2 170 32 36 17 71 36 78 41 11 7-1 41-59 161l-73 152 15 57 15 57 117 3 117 3v199h-770zm333-705c4-25 9-56 13-70 6-24 5-25-40-19l-46 7v-105l46 7c41 6 45 5 40-12-3-10-8-30-12-45l-6-28h115l-6 45-7 45 40-6 40-7v106l-41-7-42-7 6 38c4 21 9 53 13 71l6 32h-125z'
        fill={style.c1}
      />
      <path
        d='M7200 2500v-99l-117-3-117-3-15-57-15-57 72-150c40-83 72-151 72-153s-45-2-99 0c-65 2-101 7-104 15-2 7-17 74-32 150l-28 137h-58c-43 0-58 4-63 16-8 21-8 24 4 24 5 0 39 18 75 40 55 34 74 40 120 40h55v200h250zm-324-692c-4-18-9-50-13-71l-6-38 42 7 41 7v-106l-40 7-40 6 7-45c6-44 5-45-23-45h-29v310h34c32 0 33-1 27-32zm-179-148c0-30-2-43-4-27-2 15-2 39 0 55 2 15 4 2 4-28z'
        fill={style.c2}
      />
      <path
        d='M6950 2500v-100h-55c-46 0-65-6-120-40-36-22-69-40-74-40-4 0-14 18-21 40l-13 40h-237v200h520zm-105-357c15-76 30-144 33-150 3-9 33-13 101-13 89-1 94-2 76-16-22-17-81-44-131-61-46-15-191-9-249 11-47 16-115 55-115 66 0 3 31 70 68 150l67 145 61 3 61 3zm-29-316c2-7 3-76 2-152l-3-140-29-3c-26-3-28-1-22 22 3 14 9 37 12 51 5 19 3 24-7 21-8-2-26-7-42-10-27-6-27-6-27 44v50l42-6 41-7-6 39c-4 21-9 54-13 72-6 30-5 32 20 32 15 0 29-6 32-13z'
        fill={style.c1}
      />
      <path
        d='M6430 2500v-100h237l17-57 16-58-72-153-72-154 24-19c58-44 130-63 240-64 98 0 109 2 170 32 36 17 71 36 78 41 11 7-1 41-59 161l-73 152 15 57 15 57 117 3 117 3v199h-770zm333-705c4-25 9-56 13-70 6-24 5-25-40-19l-46 7v-105l46 7c41 6 45 5 40-12-3-10-8-30-12-45l-6-28h115l-6 45-7 45 40-6 40-7v106l-41-7-42-7 6 38c4 21 9 53 13 71l6 32h-125z'
        fill='none'
        stroke='#000'
        strokeWidth='24'
      />
    </svg>
  ),
};

export const riohachaPieces: Record<string, ReactNode> = {
  wP: pieces.p(style.white),
  wR: pieces.r(style.white),
  wN: pieces.n(style.white),
  wB: pieces.b(style.white),
  wQ: pieces.q(style.white),
  wK: pieces.k(style.white),

  bP: pieces.p(style.black),
  bR: pieces.r(style.black),
  bN: pieces.n(style.black),
  bB: pieces.b(style.black),
  bQ: pieces.q(style.black),
  bK: pieces.k(style.black),
};