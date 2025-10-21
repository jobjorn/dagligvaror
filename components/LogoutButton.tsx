import { signOut } from 'auth';

export function LogoutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut();
      }}
    >
      <button className="link-button" type="submit">
        Logga ut
      </button>
    </form>
  );
}
