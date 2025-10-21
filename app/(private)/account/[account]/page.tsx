import { Typography } from '@mui/material';
import { PrismaClient } from '@prisma/client';
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
  params: Promise<{ account: string }>;
}) {
  const session = await auth();

  const sieDataRow = await prisma.sIEData.findFirst({
    where: {
      companyName: session?.user?.companyName,
      databaseNumber: session?.user?.databaseNumber
    }
  });

  const sieJson: SIEjson = (sieDataRow?.sieJson ?? {}) as unknown as SIEjson;

  const { account } = await params;

  // convert account to number
  const accountNumber = Number(account);

  const accountName = sieJson?.konto?.find(
    (acc) => acc.nr === accountNumber
  )?.namn;

  if (!sieJson) {
    return <Typography variant="h1">No SIE data found</Typography>;
  }

  if (!sieJson.ver) {
    return <Typography variant="h1">No SIE journals found</Typography>;
  }

  return (
    <>
      <Typography variant="h2">
        {accountNumber} {accountName}
      </Typography>
      <BasicData accountNumber={accountNumber} siejson={sieJson} />
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
