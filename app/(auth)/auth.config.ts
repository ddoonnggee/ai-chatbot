import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  // cookies: {
  //   sessionToken: {
  //     name: `__Secure-authjs.session-token`,
  //     options: {
  //       httpOnly: true,
  //       sameSite: 'none' as const,
  //       secure: true,
  //       partitioned: true,
  //       path: '/',
  //     },
  //   },
  //   callbackUrl: {
  //     name: `__Secure-authjs.callback-url`,
  //     options: {
  //       sameSite: 'none' as const,
  //       secure: true,
  //       partitioned: true,
  //       path: '/',
  //     },
  //   },
  //   csrfToken: {
  //     name: `__Secure-authjs.csrf-token`,
  //     options: {
  //       httpOnly: true,
  //       sameSite: 'none' as const,
  //       secure: true,
  //       partitioned: true,
  //       path: '/',
  //     },
  //   },
  // },
  callbacks: {},
} satisfies NextAuthConfig;