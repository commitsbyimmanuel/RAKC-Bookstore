import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BookRequests from "../ui/BookRequests";
import BookShelf from "../ui/BookShelf";
import Button from "../ui/Button";
import CheckAvailability from "../ui/CheckAvailability";

export default function Home() {
  const [showAvailability, setShowAvailability] = useState(false);
  const [showBookRequests, setShowBookRequests] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <section className="md:col-span-2 h-[380px] rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm/5 text-white/80">Best Sellers</p>
        </div>
        <BookShelf />
      </section>

      <section className="flex flex-col gap-4">
        <Button onClick={() => navigate("/new-sale")}>New Sale</Button>
        <Button onClick={() => navigate("/payments?status=Pending")}>Settle Pending Payment</Button>
        <Button onClick={() => setShowBookRequests(!showBookRequests)}>
          {showBookRequests ? "Hide Requests" : "Book Requests"}
        </Button>
        <Button onClick={() => setShowAvailability(!showAvailability)}>
          {showAvailability ? "Hide Availability" : "Check Availability"}
        </Button>
      </section>

      {showAvailability && (
        <section className="md:col-span-3">
          <CheckAvailability />
        </section>
      )}
      {showBookRequests && (
        <section className="md:col-span-3">
          <BookRequests />
        </section>
      )}

    </div>
  );
}

