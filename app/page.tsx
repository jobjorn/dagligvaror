import { Typography } from '@mui/material';
//import iconv from 'iconv-lite';
import { auth } from 'auth';
import { Footer } from 'components/Footer';
import { Menu } from 'components/Menu';
//import { convertSIEFileToJSON } from 'lib/siejson';

//const prisma = new PrismaClient();

export default async function Page() {
  /*
https://commons.wikimedia.org/wiki/File:Burroughs_Accounting_Machine.jpg
https://commons.wikimedia.org/wiki/Category:Accounting#/media/File:Pacioli.jpg

  */
  const session = await auth();

  /*
  console.log(session);

  const fetchCompanyInformation = async () => {
    if (session) {
      const response = await fetch(
        'https://api.fortnox.se/3/companyinformation',
        {
          headers: {
            Authorization: `Bearer ${session?.user?.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      //      console.log('session user id', session?.user?.id);
      const data = await response.json();
      //      console.log('data', data);
      return data;
    }
  };
  */

  /*
  const fetchProfile = async () => {
    if (session) {
      const response = await fetch('https://api.fortnox.se/3/me', {
        headers: {
          Authorization: `Bearer ${session?.user?.id}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('session user id', session?.user?.id);
      const data = await response.json();
      console.log('data', data);
      return data;
    }
  };
  */
  /*
  const fetchSie = async () => {
    if (session) {
      const response = await fetch(
        'https://api.fortnox.se/3/sie/4?financialyear=1',
        {
          headers: {
            Authorization: `Bearer ${session?.user?.id}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('session user id', session?.user?.id);
      const data = await response.arrayBuffer();
      const cp437Buffer = Buffer.from(data);
      const utf8String = iconv.decode(cp437Buffer, 'cp437');
      const sieJSON = convertSIEFileToJSON(utf8String);

      return sieJSON;
    }
  };
*/
  // const companyInformation = await fetchCompanyInformation();
  //const profile = await fetchProfile();
  // const sie = await fetchSie();

  if (session?.user) {
    return (
      <>
        <Menu />
        <Typography variant="h1">Klementin</Typography>
        <pre>{JSON.stringify(session, null, 2)}</pre>

        <Footer />
      </>
    );
  } else {
    return (
      <>
        <Menu />
        Splash
        <Footer />
      </>
    );
  }
}
