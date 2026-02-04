import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AppLayout from "./AppLayout";
import Home from "./pages/Home";
import NewSale from "./pages/NewSale";
import Orders from "./pages/Orders";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
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
        path: "/new-sale",
        element: <NewSale />,
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
        path: "/reports",
        element: <Reports />,
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
