export function Icon({
  name,
  className
}: {
  name: "dashboard" | "companies" | "municipalities" | "demands" | "matches" | "projects";
  className?: string;
}) {
  const common = "h-5 w-5";
  const cls = className ? `${common} ${className}` : common;

  if (name === "dashboard") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 13h7V4H4v9Zm9 7h7V11h-7v9ZM4 20h7v-5H4v5Zm9-11h7V4h-7v5Z" fill="currentColor" opacity="0.9" />
      </svg>
    );
  }

  if (name === "companies") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 20V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14H4Zm14 0V10h2a2 2 0 0 1 2 2v8h-4Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M7 8h6v2H7V8Zm0 4h6v2H7v-2Zm0 4h6v2H7v-2Z" fill="currentColor" opacity="0.55" />
      </svg>
    );
  }

  if (name === "municipalities") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 3 3 8v2h18V8l-9-5Zm-7 9h14v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M7 20v-6h2v6H7Zm4 0v-6h2v6h-2Zm4 0v-6h2v6h-2Z" fill="currentColor" opacity="0.55" />
      </svg>
    );
  }

  if (name === "demands") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 3h10a2 2 0 0 1 2 2v16H5V5a2 2 0 0 1 2-2Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M8 7h8v2H8V7Zm0 4h8v2H8v-2Zm0 4h5v2H8v-2Z" fill="currentColor" opacity="0.55" />
      </svg>
    );
  }

  if (name === "matches") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8.5 8.5 11 6l2 2 2.5-2.5L18 8l-6 6-3.5-3.5Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path d="M6 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6Z" stroke="currentColor" opacity="0.55" />
      </svg>
    );
  }

  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M8 8h8v2H8V8Zm0 4h8v2H8v-2Z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

