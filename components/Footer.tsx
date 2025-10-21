import { Container } from '@mui/material';

import { Box } from '@mui/system';
import Link from 'next/link';
import { auth } from 'auth';
import { LogoutButton } from './LogoutButton';

export const Footer: React.FC<{}> = async () => {
  const session = await auth();

  return (
    <footer
      style={{
        backgroundColor: '#DB7800',
        width: '100%',
        padding: '25px',
        color: 'white',
        fontSize: '0.8em'
      }}
    >
      <Container maxWidth="md" style={{ display: 'flex' }}>
        <Box sx={{ flexGrow: 1 }}>
          <ul style={{ listStyle: 'none' }}>
            <li>
              <Link href="/">Start</Link>
            </li>
            {session?.user ? (
              <>
                <li>
                  <Link href="/settings">Inställningar</Link>
                </li>
                <li>
                  <LogoutButton />
                </li>
              </>
            ) : (
              <li>
                <Link href="/login">Logga in</Link>
              </li>
            )}
          </ul>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          <ul style={{ listStyle: 'none' }}>
            <li>
              <Link href="/about">Om</Link>
            </li>
            <li>
              <Link href="/policy">Integritets- och cookiepolicy</Link>
            </li>
          </ul>
        </Box>
        <Box sx={{ flexGrow: 1 }}>
          Dagligvaror - Grocery Management
          <br />
          © 2024
        </Box>
      </Container>
    </footer>
  );
};
