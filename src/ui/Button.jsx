export default function Button({ children, onClick, disabled, className, variant = "default" }) {
  const baseStyles = "rounded-2xl h-[50px] active:scale-95 shadow-md/15 duration-300 transition-all font-semibold";
  
  const variants = {
    default: "border border-white/20 bg-white/5 hover:bg-white/20 text-white",
    primary: "bg-orange-600 hover:bg-orange-500 border-none text-white shadow-lg shadow-orange-950/30",
    secondary: "bg-white/5 hover:bg-white/10 text-white/60 border border-white/10",
  };

  const variantStyles = variants[variant] || variants.default;
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed hover:bg-opacity-100" : "";

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles} ${disabledStyles} ${className || ""}`}
    >
      {children}
    </button>
  );
}
