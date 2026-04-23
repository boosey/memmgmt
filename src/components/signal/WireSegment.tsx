export function WireSegment() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 -right-2 -translate-y-1/2"
      width="16"
      height="10"
      viewBox="0 0 16 10"
    >
      <path
        d="M0 5 L14 5"
        stroke="var(--rule)"
        strokeWidth="1"
        fill="none"
      />
      <circle cx="14" cy="5" r="1.5" fill="var(--rule)" />
    </svg>
  );
}
