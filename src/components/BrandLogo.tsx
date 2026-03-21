/**
 * Polyglot brand logo — a stylized mark combining a speech bubble with
 * overlapping language layers, forming an abstract "P" shape.
 * Renders in theme-aware accent colors via CSS variables.
 */

interface BrandLogoProps {
  size?: number
  className?: string
}

export function BrandMark({ size = 40, className = '' }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Background circle */}
      <rect width="40" height="40" rx="10" fill="var(--t-accent)" />

      {/* Overlapping speech bubble shapes forming abstract "P" */}
      {/* Back layer — offset right */}
      <path
        d="M24 10H18C14.686 10 12 12.686 12 16V18C12 21.314 14.686 24 18 24H19L22 28V24H24C27.314 24 30 21.314 30 18V16C30 12.686 27.314 10 24 10Z"
        fill="var(--t-on-accent)"
        opacity="0.3"
      />
      {/* Front layer — main bubble */}
      <path
        d="M22 8H14C11.239 8 9 10.239 9 13V17C9 19.761 11.239 22 14 22H15L18 26V22H22C24.761 22 27 19.761 27 17V13C27 10.239 24.761 8 22 8Z"
        fill="var(--t-on-accent)"
        opacity="0.95"
      />
      {/* Text lines inside bubble */}
      <rect x="13" y="13" width="10" height="1.5" rx="0.75" fill="var(--t-accent)" opacity="0.6" />
      <rect x="13" y="16.5" width="7" height="1.5" rx="0.75" fill="var(--t-accent)" opacity="0.4" />
    </svg>
  )
}

export function BrandWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-bold font-heading gradient-text ${className}`}>
      Polyglot
    </span>
  )
}
