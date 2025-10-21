import { Box, Button, Typography } from '@mui/material';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn, providerMap } from 'auth';

export default async function LoginPage(props: {
  searchParams: { callbackUrl: string | undefined };
}) {
  return (
    <>
      <Image
        style={{ objectFit: 'cover' }}
        src="/clementines_with_leaves.jpg"
        alt="Klementin"
        layout="fill"
        objectFit="cover"
      />

      <div
        style={{
          textAlign: 'center',
          position: 'fixed',
          width: '100%',
          height: '100%',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundColor: 'rgba(49, 21, 1, 0.88)',
          zIndex: '2'
        }}
      >
        <div
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Box
            sx={{
              padding: '24px',
              margin: '16px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #8e9491',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '30px'
            }}
          >
            <Typography variant="h1">Klementin</Typography>
            <Typography variant="body1">
              Sign in to Klementin with your Fortnox account.
            </Typography>
            {Object.values(providerMap).map((provider) => (
              <form
                key={provider.id}
                action={async () => {
                  'use server';
                  try {
                    await signIn(provider.id, {
                      redirectTo: props.searchParams?.callbackUrl ?? ''
                    });
                  } catch (error) {
                    // Signin can fail for a number of reasons, such as the user
                    // not existing, or the user not having the correct role.
                    // In some cases, you may want to redirect to a custom error
                    if (error instanceof AuthError) {
                      return redirect(`/login/error?error=${error.type}`);
                    }

                    // Otherwise if a redirects happens Next.js can handle it
                    // so you can just re-thrown the error and let Next.js handle it.
                    // Docs:
                    // https://nextjs.org/docs/app/api-reference/functions/redirect#server-component
                    throw error;
                  }
                }}
              >
                <Button
                  type="submit"
                  sx={{
                    border: '1px solid #8e9491',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.1)'
                    }
                  }}
                >
                  <Image
                    style={{ borderRadius: '50%' }}
                    src="/fortnox_logo.jpeg"
                    alt="fortnox logo"
                    height={25}
                    width={25}
                  />
                  <span>Sign in with {provider.name}</span>
                </Button>
              </form>
            ))}
          </Box>
        </div>
      </div>
    </>
  );
}
