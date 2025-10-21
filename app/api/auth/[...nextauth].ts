import NextAuth, { AuthOptions } from 'next-auth';
import { OAuthConfig } from 'next-auth/providers';

const FortnoxProvider: OAuthConfig<any> = {
  id: 'fortnox',
  name: 'Fortnox',
  type: 'oauth',
  authorization: `https://apps.fortnox.se/oauth-v1/auth?client_id=${process.env.FORTNOX_CLIENT_ID}&redirect_uri=http://localhost:3000/api/auth/callback/fortnox&scope=bookkeeping&access_type=offline&response_type=code&account_type=service`,

  token: 'https://apps.fortnox.se/oauth-v1/token',
  userinfo: 'https://api.fortnox.se/3/me',
  clientId: process.env.FORTNOX_CLIENT_ID,
  clientSecret: process.env.FORTNOX_CLIENT_SECRET,
  checks: ['state'],
  profile: async (profile) => {
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email
    };
  }
};

export const authOptions: AuthOptions = {
  providers: [FortnoxProvider]
};

export default NextAuth(authOptions);
