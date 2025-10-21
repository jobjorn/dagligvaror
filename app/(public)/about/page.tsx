'use client';
import { Typography } from '@mui/material';
import { SessionProvider } from 'next-auth/react';

export default function Page() {
  return (
    <SessionProvider>
      <Typography variant="h1">Om Clementine</Typography>
      <Typography sx={{ marginY: 1 }} variant="body1">
        Herp derp, här kommer det stå något vettigt om Clementine.
      </Typography>
    </SessionProvider>
  );
}
