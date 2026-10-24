// AppLayout.jsx
import { AnimatePresence, motion as Motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import NavBar from "./navbar/NavBar";

const ROUTE_ORDER = ["/", "/orders", "/payments", "/stock"];

function AppLayout() {
  const location = useLocation();

  const prevIndexRef = useRef(ROUTE_ORDER.indexOf(location.pathname));
  const currIndex = ROUTE_ORDER.indexOf(location.pathname);

  const direction =
    currIndex !== -1 && prevIndexRef.current !== -1
      ? Math.sign(currIndex - prevIndexRef.current)
      : 0;

  useEffect(() => {
    prevIndexRef.current = currIndex;
  }, [currIndex]);

  const distance = 72;
  const variants = {
    initial: (dir) => ({
      x: dir > 0 ? distance : -distance,
      opacity: 0, // new page starts hidden
      position: "relative",
    }),
    animate: {
      x: 0,
      opacity: 1, // fade + pan IN
      position: "relative",
      transition: {
        x: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.2, ease: "linear" },
      },
    },
    // exit: (dir) => ({
    //   x: dir > 0 ? -distance : distance,
    //   opacity: 0, // fade + pan OUT
    //   position: "absolute", // keep the leaver on top while it exits
    //   inset: 0,
    //   zIndex: 50,
    //   transition: {
    //     x: { duration: 0.26, ease: [0.4, 0, 1, 1] },
    //     opacity: { duration: 0.22, ease: "linear" },
    //   },
    // }),
  };

  return (
    <div className="relative min-h-dvh w-full text-white">
      {/* Fixed background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/desert2.jpg')" }}
        />
        {/* Overlay to make the whole screen darker */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Foreground */}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-8">
        <NavBar />
        {/* Blur only the background layer, never the interactive content. */}
        <div className="relative z-30 isolate overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 bg-black/50 backdrop-blur-2xl" />
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <Motion.div
              key={location.key} // ⬅️ critical for exit to run
              custom={direction}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="relative z-10 mx-auto w-full"
            >
              <main className="p-5 md:p-8 min-h-[450px]">
                <Outlet context={direction} />
              </main>
            </Motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
