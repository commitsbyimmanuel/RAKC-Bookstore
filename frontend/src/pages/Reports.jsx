import { useState, useMemo } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { usePayments } from "../services/localAPI";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Custom dark theme styles for react-datepicker
const datePickerStyles = `
  .dark-datepicker .react-datepicker {
    background-color: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    font-family: inherit;
  }
  .dark-datepicker .react-datepicker__header {
    background-color: #1a1a1a;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  .dark-datepicker .react-datepicker__current-month,
  .dark-datepicker .react-datepicker__day-name {
    color: rgba(255, 255, 255, 0.8);
  }
  .dark-datepicker .react-datepicker__day {
    color: rgba(255, 255, 255, 0.7);
    border-radius: 8px;
  }
  .dark-datepicker .react-datepicker__day:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
  }
  .dark-datepicker .react-datepicker__day--selected,
  .dark-datepicker .react-datepicker__day--keyboard-selected {
    background-color: #3B82F6 !important;
    color: white !important;
    border-radius: 8px;
  }
  .dark-datepicker .react-datepicker__day--in-range {
    background-color: rgba(59, 130, 246, 0.3);
  }
  .dark-datepicker .react-datepicker__day--outside-month {
    color: rgba(255, 255, 255, 0.3);
  }
  .dark-datepicker .react-datepicker__navigation-icon::before {
    border-color: rgba(255, 255, 255, 0.6);
  }
  .dark-datepicker .react-datepicker__navigation:hover *::before {
    border-color: white;
  }
  .dark-datepicker .react-datepicker__triangle {
    display: none;
  }
`;

export default function Reports() {
  // Default date range: 3 months ago to today
  const today = new Date();
  const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
  
  const [dateFrom, setDateFrom] = useState(threeMonthsAgo);
  const [dateTo, setDateTo] = useState(today);

  // Fetch all sales data
  const { data: allSales = [], isLoading } = usePayments();

  // Helper to parse date from purchaseDate string (e.g., "Feb 04, 2026 17:39")
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  };

  // Get last Sunday at 00:00
  const getLastSunday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - dayOfWeek);
    lastSunday.setHours(0, 0, 0, 0);
    return lastSunday;
  };

  // Calculate stats
  const stats = useMemo(() => {
    const lastSunday = getLastSunday();
    
    let booksThisWeek = 0;
    let booksAllTime = 0;
    let pendingPayments = 0;

    allSales.forEach((sale) => {
      const saleDate = parseDate(sale.purchaseDate);
      const itemCount = sale.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
      
      booksAllTime += itemCount;
      
      if (saleDate && saleDate >= lastSunday) {
        booksThisWeek += itemCount;
      }
      
      if (sale.paymentStatus === "Pending") {
        pendingPayments += (sale.totalAmount || 0) - (sale.amountPaid || 0);
      }
    });

    return { booksThisWeek, booksAllTime, pendingPayments };
  }, [allSales]);

  // Filter sales by date range for charts
  const filteredSales = useMemo(() => {
    const from = new Date(dateFrom);
    from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    return allSales.filter((sale) => {
      const saleDate = parseDate(sale.purchaseDate);
      return saleDate && saleDate >= from && saleDate <= to;
    });
  }, [allSales, dateFrom, dateTo]);

  // Pie chart data: Bank Transfer vs Cash
  const paymentMethodData = useMemo(() => {
    const counts = { "Bank Transfer": 0, "Cash": 0 };
    filteredSales.forEach((sale) => {
      const method = sale.paymentMethod || "Cash";
      counts[method] = (counts[method] || 0) + 1;
    });
    return [
      { name: "Bank Transfer", value: counts["Bank Transfer"], color: "#9997E7" },
      { name: "Cash", value: counts["Cash"], color: "#FA5093" },
    ].filter((d) => d.value > 0);
  }, [filteredSales]);

  // Bar chart data: Books sold over time (grouped by week)
  const booksSoldOverTime = useMemo(() => {
    const weeklyData = {};
    
    filteredSales.forEach((sale) => {
      const saleDate = parseDate(sale.purchaseDate);
      if (!saleDate) return;
      
      // Get week start (Sunday)
      const weekStart = new Date(saleDate);
      weekStart.setDate(saleDate.getDate() - saleDate.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split("T")[0];
      
      const itemCount = sale.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + itemCount;
    });

    return Object.entries(weeklyData)
      .map(([week, count]) => ({
        week: new Date(week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        books: count,
      }))
      .sort((a, b) => new Date(a.week) - new Date(b.week));
  }, [filteredSales]);

  // Transaction table data: sales per day, sorted descending
  const transactionTable = useMemo(() => {
    const dailyData = {};
    
    filteredSales.forEach((sale) => {
      const saleDate = parseDate(sale.purchaseDate);
      if (!saleDate) return;
      
      const dayKey = saleDate.toISOString().split("T")[0];
      if (!dailyData[dayKey]) {
        dailyData[dayKey] = { date: dayKey, transactions: 0, totalAmount: 0, books: 0 };
      }
      dailyData[dayKey].transactions += 1;
      dailyData[dayKey].totalAmount += sale.totalAmount || 0;
      dailyData[dayKey].books += sale.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
    });

    return Object.values(dailyData).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [filteredSales]);

  const formatDateDisplay = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="w-full h-full">
        <h1 className="text-2xl mb-3">Reports</h1>
        <div className="flex justify-center items-center w-full h-[35vh]">
          <div className="flex items-center gap-2 text-white/60">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Loading reports...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full space-y-6">
      <style>{datePickerStyles}</style>
      <h1 className="text-2xl">Reports</h1>

      {/* Stats Tiles */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Books Sold This Week</p>
          <p className="text-4xl font-bold text-white">{stats.booksThisWeek}</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Books Sold (All Time)</p>
          <p className="text-4xl font-bold text-white">{stats.booksAllTime}</p>
        </div>
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Payments Pending</p>
          <p className="text-4xl font-bold text-amber-400">AED {stats.pendingPayments.toFixed(0)}</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
        <span className="text-sm text-white/60">Date Range:</span>
        <div className="dark-datepicker">
          <DatePicker
            selected={dateFrom}
            onChange={(date) => setDateFrom(date)}
            selectsStart
            startDate={dateFrom}
            endDate={dateTo}
            maxDate={dateTo}
            dateFormat="MMM dd, yyyy"
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 w-36 cursor-pointer"
            popperClassName="dark-datepicker"
          />
        </div>
        <span className="text-white/40">to</span>
        <div className="dark-datepicker">
          <DatePicker
            selected={dateTo}
            onChange={(date) => setDateTo(date)}
            selectsEnd
            startDate={dateFrom}
            endDate={dateTo}
            minDate={dateFrom}
            maxDate={new Date()}
            dateFormat="MMM dd, yyyy"
            className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 w-36 cursor-pointer"
            popperClassName="dark-datepicker"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pie Chart: Payment Methods */}
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Payment Methods</h3>
          {paymentMethodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={8}
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-white/60">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-white/40">No data for selected period</div>
          )}
        </div>

        {/* Bar Chart: Books Sold Over Time */}
        <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur">
          <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Books Sold Over Time</h3>
          {booksSoldOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={booksSoldOverTime}>
                <XAxis dataKey="week" stroke="#666" fontSize={12} />
                <YAxis stroke="#666" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px" }}
                  labelStyle={{ color: "#fff" }}
                />
                <Bar dataKey="books" fill="#22C55E" radius={[20, 20, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-white/40">No data for selected period</div>
          )}
        </div>
      </div>

      {/* Transaction Table */}
      <div className="rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur">
        <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider mb-4">Daily Transactions</h3>
        {transactionTable.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-white/60 font-medium">Date</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Transactions</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Books Sold</th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactionTable.map((row) => (
                  <tr key={row.date} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4 text-white">{formatDateDisplay(row.date)}</td>
                    <td className="py-3 px-4 text-white text-right">{row.transactions}</td>
                    <td className="py-3 px-4 text-white text-right">{row.books}</td>
                    <td className="py-3 px-4 text-white text-right">AED {row.totalAmount.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[100px] text-white/40">No transactions for selected period</div>
        )}
      </div>
    </div>
  );
}
