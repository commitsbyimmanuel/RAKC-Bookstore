const payments = [
  {
    payer: "Temi Cotek",
    total_amount: 75,
    amount_payed: 50,
    status: "Pending",
  },
  {
    payer: "Blessing Jossy",
    total_amount: 110,
    amount_payed: 100,
    status: "Pending",
  },
  {
    payer: "Duot Mabil",
    total_amount: 65,
    amount_payed: 65,
    status: "Complete",
  },
];

export default function Payments() {
  return (
    <div className="w-full h-full">
      <h1 className="text-2xl mb-3">Payments</h1>
      {payments.length == 0 && (
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="text-center">No payments pending!</div>
        </div>
      )}
      <div className="divide-y-1">
        {payments.map((entry) => (
          <div
            key={entry.payer}
            className="py-5 items-center flex justify-between"
          >
            <div className="flex-col">
              <div className="text-lg">{entry.payer}</div>
              {entry.status === "Pending" ? (
                <div className="text-sm italic font-medium">
                  Amount Pending: {entry.total_amount - entry.amount_payed}
                </div>
              ) : null}
            </div>
            <div
              className={`${
                entry.status === "Pending" ? "bg-amber-600" : "bg-green-700"
              } rounded-full p-1 px-2 w-23 text-center`}
            >
              {entry.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
