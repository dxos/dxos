# Mosaic

## Overview

- Mosaic is a UX framework for tiled data components.
- It is responsive to work with phones, tablets, and larger format computers and screens (as well as AR).
- The framework UX consists of the following concepts:
  - **The Shell**: A framework-wide container that provides access to global functions (Profile, Spaces, Sharing, Global options, etc.)
  - **Frames**: Modular panels that can be dynamically discovered and downloaded that represent data in use-case specific ways (Kanban, Calendar, Map, etc.)
  - **Tiles**: Atomic components that typically represent individual data objects.


## Geometry

- We make the following assumptions re form factors:
  - `sm` (phone): iPhone 12 Pro (390 x 844 px)
  - `md` (tablet): iPad Pro 11" (1194 x 834 px, landscape)
  - `lg` (everything else)


## Fonts and Padding

- The standard font size is 1rem (16px)
- The standard padding is 0.75rem (12px)
- The standard "row" height is 2.5rem (40px), including 0.75rem padding.


## Layout

The diagram below illustrates different kinds of containers, panels, and lists.

![UX](./ux.drawio.svg)

- On phone (`sm`) devices, single-column components should be full width with no additional horizontal padding.
- Columns that are arranged side-by-side (e.g., Kanbans) should be separated by 1.5rem, such that when a single column is display on a phone, 
  there are regular margins that separate columns that would scroll horizontally (with snap).


## Lists

- List headers and rows are 2.5rem (40px) high (1rem for the text, plus 0.7rem for top and bottom padding.)
- The padding allows for list text to be represented as an outlined input element.
- List rows typically have left and right gutters for icons arranged in a grid.
- Optional list headers may contain an icon and/or menu button (aligned with the grid).
- Draggable list rows may have an additional grip icon on the left hand side.
- Icons are 1rem with 0.75rem padding (i.e., 40px x 40px in total).
- List rows may have variable heights.


## TODO

- TODO(burdon): Tables.
- TODO(burdon): Schema.
- TODO(burdon): Input forms.
- TODO(burdon): Navigation.


