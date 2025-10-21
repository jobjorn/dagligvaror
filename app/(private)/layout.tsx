import { Box } from '@mui/system';
import { Footer } from 'components/Footer';
import { Menu } from 'components/Menu';

export default function PrivateLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Menu />
      <Box
        sx={{
          flexGrow: 1,
          marginTop: '2em',
          marginBottom: '2em',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {children}
      </Box>
      <Footer />
    </>
  );
}
