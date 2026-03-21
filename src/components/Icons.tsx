interface IconProps {
  className?: string
}

export function BookStack({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

export function Target({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function BookOpen({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  )
}

export function Cards({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="14" height="16" rx="2" />
      <path d="M8 2h10a2 2 0 012 2v13" />
    </svg>
  )
}

export function Puzzle({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75" />
      <circle cx="12" cy="17.25" r=".75" fill="currentColor" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

export function Trophy({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8v8a4 4 0 01-8 0V3z" />
      <path d="M8 5H5a1 1 0 00-1 1v1a4 4 0 004 4" />
      <path d="M16 5h3a1 1 0 011 1v1a4 4 0 01-4 4" />
      <path d="M12 15v3" />
      <path d="M8 21h8" />
      <path d="M9 18h6v3H9z" />
    </svg>
  )
}

export function Sparkle({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      <path d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  )
}

export function Dumbbell({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.828 14.828a4 4 0 01-5.656 0M9.172 9.172a4 4 0 015.656 0" />
      <path d="M16.243 7.757l1.414-1.414a2 2 0 012.828 0l.172.172a2 2 0 010 2.828l-1.414 1.414" />
      <path d="M7.757 16.243l-1.414 1.414a2 2 0 01-2.828 0l-.172-.172a2 2 0 010-2.828l1.414-1.414" />
    </svg>
  )
}

export function Brain({ className = 'w-8 h-8' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 00-4 4c0 .6.13 1.17.37 1.68A3.5 3.5 0 005 11a3.5 3.5 0 001.02 2.47A3 3 0 005 16a3 3 0 002.2 2.89A2.5 2.5 0 009.5 21H12" />
      <path d="M12 2a4 4 0 014 4c0 .6-.13 1.17-.37 1.68A3.5 3.5 0 0119 11a3.5 3.5 0 01-1.02 2.47A3 3 0 0119 16a3 3 0 01-2.2 2.89A2.5 2.5 0 0114.5 21H12" />
      <path d="M12 2v19" />
    </svg>
  )
}

export function Palette({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2 0-.53-.21-1.01-.54-1.37-.34-.37-.56-.85-.56-1.38 0-1.1.9-2 2-2h2.36c3.07 0 5.64-2.57 5.64-5.64C22.9 5.56 18.07 2 12 2z" />
      <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="11" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16" cy="8.5" r="1.5" fill="currentColor" />
    </svg>
  )
}

export function FlagPL({ className = 'w-8 h-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="pl-clip"><rect width="40" height="28" rx="3" /></clipPath></defs>
      <g clipPath="url(#pl-clip)">
        <rect width="40" height="14" fill="#ffffff" />
        <rect y="14" width="40" height="14" fill="#DC143C" />
      </g>
      <rect width="40" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  )
}

export function FlagES({ className = 'w-8 h-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="es-clip"><rect width="40" height="28" rx="3" /></clipPath></defs>
      <g clipPath="url(#es-clip)">
        <rect width="40" height="28" fill="#F1BF00" />
        <rect width="40" height="7" fill="#AA151B" />
        <rect y="21" width="40" height="7" fill="#AA151B" />
      </g>
      <rect width="40" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  )
}

export function FlagEN({ className = 'w-8 h-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="en-clip"><rect width="40" height="28" rx="3" /></clipPath></defs>
      <g clipPath="url(#en-clip)">
        <rect width="40" height="28" fill="#00247D" />
        <path d="M0 0L40 28M40 0L0 28" stroke="#fff" strokeWidth="4.5" />
        <path d="M0 0L40 28M40 0L0 28" stroke="#CF142B" strokeWidth="2.5" />
        <path d="M20 0v28M0 14h40" stroke="#fff" strokeWidth="7" />
        <path d="M20 0v28M0 14h40" stroke="#CF142B" strokeWidth="4" />
      </g>
      <rect width="40" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  )
}

export function FlagFR({ className = 'w-8 h-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="fr-clip"><rect width="40" height="28" rx="3" /></clipPath></defs>
      <g clipPath="url(#fr-clip)">
        <rect width="13.33" height="28" fill="#002395" />
        <rect x="13.33" width="13.34" height="28" fill="#ffffff" />
        <rect x="26.67" width="13.33" height="28" fill="#ED2939" />
      </g>
      <rect width="40" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  )
}

export function FlagDE({ className = 'w-8 h-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="de-clip"><rect width="40" height="28" rx="3" /></clipPath></defs>
      <g clipPath="url(#de-clip)">
        <rect width="40" height="9.33" fill="#000000" />
        <rect y="9.33" width="40" height="9.34" fill="#DD0000" />
        <rect y="18.67" width="40" height="9.33" fill="#FFCC00" />
      </g>
      <rect width="40" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  )
}

export function FlagIT({ className = 'w-8 h-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="it-clip"><rect width="40" height="28" rx="3" /></clipPath></defs>
      <g clipPath="url(#it-clip)">
        <rect width="13.33" height="28" fill="#009246" />
        <rect x="13.33" width="13.34" height="28" fill="#ffffff" />
        <rect x="26.67" width="13.33" height="28" fill="#CE2B37" />
      </g>
      <rect width="40" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  )
}

export function FlagPT({ className = 'w-8 h-6' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="pt-clip"><rect width="40" height="28" rx="3" /></clipPath></defs>
      <g clipPath="url(#pt-clip)">
        <rect width="40" height="28" fill="#FF0000" />
        <rect width="15" height="28" fill="#006600" />
        <circle cx="15" cy="14" r="5" fill="#FFCC00" />
      </g>
      <rect width="40" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.15" />
    </svg>
  )
}
