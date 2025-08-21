import BookShelf from "../ui/BookShelf";
import Button from "../ui/Button";

export default function Home() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <section className="md:col-span-2 h-[380px] rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm/5 text-white/80">Best Sellers</p>
        </div>
        <BookShelf />
      </section>

      <section className="flex h-[380px] flex-col gap-4">
        <Button>New Sale</Button>
        <Button>Settle Pending Payment</Button>
        <Button>Create Book Request</Button>
        <Button>Check Availability</Button>
      </section>
    </div>
  );
}
