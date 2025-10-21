import { Typography } from '@mui/material';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { auth } from 'auth';
import { AttachedFiles } from 'components/reconciliation/AttachedFiles';
import { BasicData } from 'components/reconciliation/BasicData';
import { CommentsAndHistory } from 'components/reconciliation/CommentsAndHistory';
import { ReconciliationRows } from 'components/reconciliation/ReconciliationRows';
import { Transactions } from 'components/reconciliation/Transactions';
import { SIEjson } from 'types/types';

const prisma = new PrismaClient();

export default async function Page({
  params
}: {
  params: Promise<{ account: string; month: string }>;
}) {
  const session = await auth();

  const sieDataRow = await prisma.sIEData.findFirst({
    where: {
      companyName: session?.user?.companyName,
      databaseNumber: session?.user?.databaseNumber
    }
  });

  const sieJson: SIEjson = (sieDataRow?.sieJson ?? {}) as unknown as SIEjson;

  const { account, month } = await params;

  // check account format
  const accountSchema = z.string().regex(/^\d{4}$/, {
    message: 'Account must be a number with 4 digits'
  });
  const parsedAccount = accountSchema.safeParse(account);
  if (!parsedAccount.success) {
    return <Typography variant="h1">Invalid account format</Typography>;
  }

  // convert account to number
  const accountNumber = Number(account);

  const accountName = sieJson?.konto?.find(
    (acc) => acc.nr === accountNumber
  )?.namn;

  if (!accountName) {
    return <Typography variant="h1">Account not found</Typography>;
  }

  // check month format
  const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, {
    message: 'Month must be in the format YYYY-MM'
  });

  const parsedMonth = monthSchema.safeParse(month);

  // check if month is in current räkenskapsår
  const currentYear = sieJson?.rar;
  console.log('rar', currentYear);
  // TODO här ska vi kolla att månaden är i räkenskapsåret som vi jobbar med

  if (!parsedMonth.success) {
    return <Typography variant="h1">Invalid month format</Typography>;
  }

  if (!sieJson) {
    return <Typography variant="h1">No SIE data found</Typography>;
  }

  if (!sieJson.ver) {
    return <Typography variant="h1">No SIE journals found</Typography>;
  }

  return (
    <>
      <Typography variant="h2">
        {month}: {accountNumber} {accountName}
      </Typography>
      <BasicData
        accountNumber={accountNumber}
        siejson={sieJson}
        month={month}
      />
      <ReconciliationRows />
      <AttachedFiles />
      <CommentsAndHistory />
      <Transactions
        accountNumber={accountNumber}
        ib={sieJson.ib.find((ib) => ib.konto === accountNumber)?.saldo ?? 0}
        siejson={sieJson}
      />
    </>
  );
}
