import { Suspense } from "react";
import { z } from "zod";

import { InterviewScreen } from "../../interview/InterviewScreen.tsx";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const roleSchema = z.enum(["tenant", "home"]).catch("tenant");

async function InterviewForRole({ searchParams }: { searchParams: SearchParams }): Promise<React.JSX.Element> {
  const role = roleSchema.parse((await searchParams).role);
  return <InterviewScreen role={role} />;
}

export default function InterviewPage({ searchParams }: { searchParams: SearchParams }): React.JSX.Element {
  return (
    <Suspense>
      <InterviewForRole searchParams={searchParams} />
    </Suspense>
  );
}
