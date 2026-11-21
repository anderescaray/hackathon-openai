export type LogLevel = "info" | "warn" | "error";

export type LogEntry = {
  msg: string;
  event_name: string;
  request_id: string;
  data?: Record<string, string | number | boolean>;
};

export function logEvent(level: LogLevel, entry: LogEntry): void {
  console[level](JSON.stringify({ level, ...entry }));
}
