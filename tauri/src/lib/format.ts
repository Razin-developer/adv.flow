export function formatDate(date?: string) {
  if (!date) return "Recently";

  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
