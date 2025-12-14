"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ReactNode } from "react";

// Allow disabling auth for local testing by setting NEXT_PUBLIC_DISABLE_AUTH=true
const DISABLE_AUTH = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

const testSession: Session = {
  user: { name: "Test User", email: "test@example.com" },
  // expire in 24 hours
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider session={DISABLE_AUTH ? testSession : undefined}>
      {children}
    </SessionProvider>
  );
}


