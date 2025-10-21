import { Footer } from "components/Footer";
import { Menu } from "components/Menu";

export default async function Page() {
  return (
    <>
      <Menu />
      <main style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Welcome to Dagligvaror</h1>
        <p>Your grocery management application</p>
      </main>
      <Footer />
    </>
  );
}
