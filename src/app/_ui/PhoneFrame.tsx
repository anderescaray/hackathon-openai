/**
 * 390×844 phone on desktop, full screen on a real phone (see `.phone-screen` in globals.css).
 * Every screen renders inside this box; lay screens out with `absolute inset-0`.
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone-desk">
      <div className="phone-screen font-sans text-ink">{children}</div>
    </div>
  );
}
