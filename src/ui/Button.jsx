export default function Button({ children }) {
  return (
    <button className="border border-white/20 bg-white/5 rounded-3xl h-[50px] hover:bg-white/20 active:scale-95 shadow-md/15 duration-300">
      {children}
    </button>
  );
}
