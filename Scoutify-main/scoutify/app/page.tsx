import { Suspense } from "react";
import Hero from "@/src/components/Hero";
import ProfileInput from "@/src/components/ProfileInput";
import ModelOutput from "@/src/components/ModelOutput";
import Skeleton from "@/src/components/Skeleton";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Hero />
      <div className="flex-1 flex">
        <div className="w-1/3 p-4">
          <ProfileInput />
        </div>
        <div className="flex-1">
          <Suspense fallback={<Skeleton />}>
            <ModelOutput />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
