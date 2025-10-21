import { signIn } from 'auth';

export function LoginButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signIn();
      }}
    >
      <button className="link-button" type="submit">
        Logga in
      </button>
    </form>
  );
}
