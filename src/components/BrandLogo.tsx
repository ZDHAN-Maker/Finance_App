interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ size = "md", showText = true, className = "" }: BrandLogoProps) {
  const badgeClasses = {
    sm: "h-7 w-7 text-xs rounded-md shadow-xs",
    md: "h-9 w-9 text-sm rounded-lg shadow-sm",
    lg: "h-12 w-12 text-base rounded-xl shadow-md",
  }[size];

  const textClasses = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  }[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Badge logo ala D'GYM dengan gradasi Maroon Crimson (#881337 -> #4C0519) */}
      <div
        className={`flex shrink-0 items-center justify-center font-display font-black tracking-tight text-white transition-transform active:scale-95 ${badgeClasses}`}
        style={{
          background: "linear-gradient(135deg, #881337 0%, #4c0519 100%)",
          boxShadow: "0 2px 8px rgba(136, 19, 55, 0.28)",
        }}
        aria-label="Logo D'Cash"
      >
        DC
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={`font-display font-bold tracking-tight text-ink ${textClasses}`}>
            D&apos;Cash
          </span>
        </div>
      )}
    </div>
  );
}
