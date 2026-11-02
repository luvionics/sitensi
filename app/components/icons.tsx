export type IconProps = { className?: string };

export function Svg({
  className,
  children,
  w = 2,
}: IconProps & { children: React.ReactNode; w?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const FolderIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </Svg>
);

export const BookIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    <path d="m9 11 2 2 4-4" />
  </Svg>
);

export const PlusIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const ChevronDown = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const ChevronRight = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const UserIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </Svg>
);

export const SettingsIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Svg>
);

export const LogoutIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);

export const CloseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const MenuIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);