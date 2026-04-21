"use client";

export default function LocalDate({
  iso,
  fallback = "",
  format = "long",
}: {
  iso: string | null;
  fallback?: string;
  format?: "long" | "short" | "date";
}) {
  if (!iso) return <>{fallback}</>;
  const d = new Date(iso);
  if (format === "short") {
    return <>{d.toLocaleString("en-US", { month: "short", year: "numeric" })}</>;
  }
  if (format === "date") {
    return <>{d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>;
  }
  return (
    <>
      {d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}
    </>
  );
}
