import { Dock } from "../_ui/Dock";
import { MatchWatcher } from "../_features/match/MatchWatcher";

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Dock variant="landlord" />
      <MatchWatcher role="home" />
    </>
  );
}
