export default function BottomBar() {
  const currentTime = new Date().toLocaleTimeString();

  return (
    <footer className="mx-auto w-full rounded-2xl border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="h-9 text-lg font-semibold tracking-wide items-center px-3 py-1">
            {currentTime}
          </h1>
        </div>
      </div>
    </footer>
  );
}
