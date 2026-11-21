import { Homie } from "./homie/Homie";

/** Temporary screen body used by the F0 skeleton. Replace it, don't style it. */
export function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 pb-[86px] text-center">
      <Homie mood="idle" size={110} />
      <h1 className="font-display text-[28px] font-semibold">{title}</h1>
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}
