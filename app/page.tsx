import { Footer } from "components/Footer";
import { Menu } from "components/Menu";
//const prisma = new PrismaClient();

export default async function Page() {
  return (
    <>
      <Menu />
      Splash
      <Footer />
    </>
  );
}
