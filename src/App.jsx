import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./AppLayout";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Payments from "./pages/Payments";
import Stock from "./pages/Stock";

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/orders",
        element: <Orders />,
      },
      {
        path: "/payments",
        element: <Payments />,
      },
      {
        path: "/stock",
        element: <Stock />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
