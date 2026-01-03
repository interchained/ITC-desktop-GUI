interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { container: "w-10 h-10", image: "w-10 h-10" },
  md: { container: "w-16 h-16", image: "w-16 h-16" },
  lg: { container: "w-24 h-24", image: "w-24 h-24" },
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  const sizes = sizeMap[size];

  return (
    <div className={`${sizes.container} rounded-2xl overflow-hidden shadow-lg flex items-center justify-center bg-[#0a0a0a] ${className}`}>
      <img
        src={new URL("../../logo.png", import.meta.url).href}
        alt="Interchained"
        className={`${sizes.image} object-contain`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
          const parent = e.currentTarget.parentElement;
          if (parent) parent.textContent = "I";
        }}
      />
    </div>
  );
}
