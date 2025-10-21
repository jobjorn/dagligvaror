import { Typography } from '@mui/material';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { auth } from 'auth';
import { generateMonthlyOverview } from 'lib/helpers';
import { SIEjson } from 'types/types';

const prisma = new PrismaClient();

const session = await auth();

const sieDataRow = await prisma.sIEData.findFirst({
  where: {
    companyName: session?.user?.companyName,
    databaseNumber: session?.user?.databaseNumber
  }
});

const sieJson: SIEjson = (sieDataRow?.sieJson ?? {}) as unknown as SIEjson;

export default async function Page() {
  if (!sieJson) {
    return <Typography variant="h1">No SIE data found</Typography>;
  }

  if (!sieJson.ver) {
    return <Typography variant="h1">No SIE journals found</Typography>;
  }

  const monthlyOverview = generateMonthlyOverview(sieJson);

  // return in a pretty table

  return (
    <>
      <table className="overviewTable">
        <thead>
          <tr>
            <th>#</th>
            <th>Konto</th>
            <th className="currencyCell">January</th>
            <th className="currencyCell">February</th>
            <th className="currencyCell">March</th>
            <th className="currencyCell">April</th>
            <th className="currencyCell">May</th>
            <th className="currencyCell">June</th>
            <th className="currencyCell">July</th>
            <th className="currencyCell">August</th>
            <th className="currencyCell">September</th>
            <th className="currencyCell">October</th>
            <th className="currencyCell">November</th>
            <th className="currencyCell">December</th>
          </tr>
        </thead>
        <tbody>
          {monthlyOverview.map((account) => (
            <tr key={account.accountNumber}>
              <td>
                <Link href={`/account/${account.accountNumber}`}>
                  {account.accountNumber}
                </Link>
              </td>
              <td>{account.accountName}</td>
              <td className="currencyCell">
                {account.january.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>

              <td className="currencyCell">
                {account.february.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>

              <td className="currencyCell">
                {account.march.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.april.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.may.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.june.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.july.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.august.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.september.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.october.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.november.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
              <td className="currencyCell">
                {account.december.toLocaleString('sv-SE', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
