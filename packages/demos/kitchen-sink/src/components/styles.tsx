//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';

// https://mui.com/customization/color/#color-palette

export const styles = css`
  .monospace {
    font-family: monospace;
  }

  .example_type_org {
    color: #00796b;
  }
  .example_type_project {
    color: #7b1fa2;
  }
  .example_type_person {
    color: #e64a19;
  }
  .example_type_task {
    color: #388e3c;
  }
  
  svg {
    g.example_type_org {
      circle {
        fill: #00796b;
      }
    }
    g.example_type_project {
      circle {
        fill: #7b1fa2;
      }
    }
    g.example_type_person {
      circle {
        fill: #e64a19;
      }
    }
    g.example_type_task {
      circle {
        fill: #388e3c;
      }
    }
  }
`;
