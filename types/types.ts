export type Severity = "error" | "warning" | "info" | "success";

export interface StatusMessage {
  severity: Severity;
  message: string;
  timestamp: number;
}
