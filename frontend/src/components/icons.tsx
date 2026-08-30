import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'users'
  | 'grid'
  | 'radio'
  | 'bell'
  | 'user'
  | 'settings'
  | 'wiki'
  | 'community'
  | 'messages'
  | 'channels'
  | 'search'
  | 'spark'
  | 'star'

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.2 12 3l8.5 7.2" />
      <path d="M5.5 9.2V20a.6.6 0 0 0 .6.6H9V15h6v5.6h2.9a.6.6 0 0 0 .6-.6V9.2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M15.2 5.2a3.2 3.2 0 0 1 0 5.8M17.5 14.6a5.5 5.5 0 0 1 3 4.9" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </>
  ),
  radio: (
    <>
      <path d="M4 14.5A8 8 0 0 1 20 14.5" />
      <path d="M6 14.5a6 6 0 0 1 12 0" />
      <circle cx="12" cy="14.6" r="2.1" />
      <path d="M8.5 20.5a3 3 0 0 1 7 0" />
      <path d="M5 20.5a4.4 4.4 0 0 1 3-4m8 4a4.4 4.4 0 0 0 3-4" />
    </>
  ),
  bell: (
    <>
      <path d="M12 4a5.5 5.5 0 0 0-5.5 5.5c0 4-1.4 5.3-2 5.9h15c-.6-.6-2-1.9-2-5.9A5.5 5.5 0 0 0 12 4Z" />
      <path d="M10 18.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20.5a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 3.5v2.4m0 12.2v2.4l-2.1.2-1-1.3-2-1.4-.3 2.1-2 .9-1.3-1.9.7-2 0-2.4-1.5-.6-1-2 .2-2 2-.9 1.3-1.9 1.9-.7 1.7 1.5 2.3-.8.8-2.2 2.1-.7 2 1 1 2 .4 2-1 2 .3.5 2-2 .8-2.4-.5-1.7 1.5-2-.5-2.2.8-1.2 2-.3 1.9-1.3 1.2-2 .6-.7 2-2-.4-1.8-1.2-2-1-1.7-2.2-.5-1.7-1.9.1-2.1Z" />
    </>
  ),
  wiki: (
    <>
      <path d="M4.5 4.5A2.5 2.5 0 0 1 7 4.3c1.7.2 3.3.9 5 2v9.4c-1.7-1.1-3.3-1.8-5-2-1 0-1.8.2-2.5.7Z" />
      <path d="M19.5 4.5A2.5 2.5 0 0 0 17 4.3c-1.7.2-3.3.9-5 2v9.4c1.7-1.1 3.3-1.8 5-2 1 0 1.8.2 2.5.7Z" />
    </>
  ),
  community: (
    <>
      <circle cx="9" cy="9" r="2.8" />
      <circle cx="17.5" cy="10.5" r="2.2" />
      <path d="M4.5 18.5a4.5 4.5 0 0 1 9 0" />
      <path d="M15.5 17.5a3.5 3.5 0 0 1 5 0" />
    </>
  ),
  messages: (
    <>
      <path d="M4 5.5h16v9.4H9l-5 4Z" />
      <path d="M8 9h8M8 12h5" />
    </>
  ),
  channels: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <path d="M7 14v5m-3-2.5h6m4-2.5v5m-3-2.5h6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
    </>
  ),
  spark: (
    <path d="M12 3.5 14 9l5.5 2L14 13l-2 5.5L10 13l-5.5-2L10 9Z" />
  ),
  star: (
    <path d="m12 3.5 2.5 5.1 5.6.8-4 4 .9 5.6L12 16.6l-5 2.4.9-5.6-4-4 5.6-.8Z" />
  ),
}

export function Icon({ name, size = 18, className, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
