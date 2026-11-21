import { Dock } from "../_ui/Dock";
import { MatchWatcher } from "../_features/match/MatchWatcher";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Dock variant="tenant" />
      <MatchWatcher role="tenant" />
    </>
  );
}
