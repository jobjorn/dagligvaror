'use client';

import { createTheme } from '@mui/material';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#DB7800',
      contrastText: '#fff'
    }
  },
  components: {
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 20
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          padding: '0 5px ',
          margin: '0px',
          width: 'fit-content',
          minWidth: '15px'
        }
      }
    }
  }
});
