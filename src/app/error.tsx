"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-muted">{error.message || "An unexpected error occurred."}</p>
      <button type="button" onClick={reset} className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
        Try again
      </button>
    </div>
  );
}
