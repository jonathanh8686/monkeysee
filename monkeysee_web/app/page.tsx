import { Suspense } from "react";
import { HomeContent } from "./home-content";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black font-sans text-white">
      <main className="flex w-full max-h-[90vh] flex-col items-stretch justify-between border border-zinc-800/80 bg-black/80 px-6 py-12 shadow-[0_0_80px_rgba(0,0,0,0.8)] sm:px-10 sm:py-16 lg:w-[75vw] lg:rounded-[40px]">
        <Suspense fallback={<div className="text-zinc-500">Loading...</div>}>
          <HomeContent />
        </Suspense>
      </main>
    </div>
  );
}
