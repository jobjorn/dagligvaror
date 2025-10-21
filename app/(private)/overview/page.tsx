import { Typography } from "@mui/material";
import { PrismaClient } from "@prisma/client";
import Link from "next/link";

const prisma = new PrismaClient();

export default async function Page() {
  return <>Hej hopp! Detta är en översiktssida.</>;
}
