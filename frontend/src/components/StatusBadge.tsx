import { ContentStatus } from "@/lib/cms";

export function StatusBadge({ status }: { status: ContentStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{status.toLowerCase()}</span>;
}
