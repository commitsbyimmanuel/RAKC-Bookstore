import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookLookup } from "../hooks/useBookLookup";
import { useCreatePayment, useCreateSale, useUpdateBookStock } from "../services/localAPI";
import Button from "../ui/Button";
import CheckoutModal from "../ui/CheckoutModal";


export default function NewSale() {
  const [isbn, setIsbn] = useState("");
  const [searchISBN, setSearchISBN] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [cart, setCart] = useState([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const navigate = useNavigate();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setPurchaseDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month} ${day}, ${year} ${hours}:${minutes}`;
  };

  const { data: book, isLoading, isError, error } = useBookLookup(searchISBN);
  const updateStockMutation = useUpdateBookStock();
  const createSaleMutation = useCreateSale();
  const createPaymentMutation = useCreatePayment();


  // Auto-search when ISBN reaches 13 digits
  useEffect(() => {
    const cleanISBN = isbn.replace(/[-\s]/g, "");
    if (cleanISBN.length === 13) {
      setSearchISBN(cleanISBN);
    }
  }, [isbn]);

  // Keyboard controls for quantity
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowUp") {
        setQuantity(prev => {
          if (book && book.source === "local") {
            return Math.min(prev + 1, book.stock);
          }
          return prev + 1;
        });
      } else if (e.key === "ArrowDown") {
        setQuantity(prev => Math.max(prev - 1, 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [book]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      const cleanISBN = isbn.replace(/[-\s]/g, "");
      if (cleanISBN.length >= 10) {
        setSearchISBN(cleanISBN);
      }
    }
  };

  const addToCart = () => {
    if (!book || book.source !== "local") return;
    
    // Check if book already in cart
    const existingIndex = cart.findIndex(item => item.isbn === book.isbn);
    if (existingIndex !== -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([...cart, { ...book, quantity }]);
    }
    
    // Reset state for next book
    setIsbn("");
    setSearchISBN("");
    setQuantity(1);
  };

  const removeFromCart = (isbnToRm) => {
    setCart(cart.filter(item => item.isbn !== isbnToRm));
  };

  const handleProcessSale = (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    // Show checkout modal instead of immediately processing
    setShowCheckoutModal(true);
  };

  const handleCheckoutConfirm = async (amountPaid) => {
    try {
      const totalAmount = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
      
      // Determine payment status
      const status = amountPaid >= totalAmount ? "Complete" : "Pending";
      
      // 1. Create payment record
      await createPaymentMutation.mutateAsync({
        payer: customerName.trim() || "Anonymous",
        total_amount: totalAmount,
        amount_payed: amountPaid,
        status: status,
      });

      // 2. Record the sale
      await createSaleMutation.mutateAsync({
        items: cart.map(item => ({
          isbn: item.isbn,
          title: item.title,
          quantity: item.quantity,
          unitPrice: item.price
        })),
        customerName: customerName.trim() || "Anonymous",
        totalAmount: totalAmount,
        purchaseDate: formatDate(purchaseDate),
      });

      // 3. Update stock for each item
      for (const item of cart) {
        const newStock = Math.max(0, item.stock - item.quantity);
        await updateStockMutation.mutateAsync({
          id: item.id,
          newStock: newStock,
        });
      }

      // 4. Close modal and navigate back
      setShowCheckoutModal(false);
      navigate("/");
    } catch (err) {
      console.error("Sale processing failed:", err);
    }
  };


  const isProcessing = updateStockMutation.isPending || createSaleMutation.isPending || createPaymentMutation.isPending;
  const totalPrice = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const canAddToCart = book && book.source === "local" && book.stock >= quantity && quantity > 0;

  // Stock color coding (based on actual stock)
  const stockColorClass = book?.stock === 0 ? "text-red-500" : book?.stock === 1 ? "text-yellow-400" : "text-green-400";

  return (
    <div className="grid gap-5 md:grid-cols-3 h-full">
      {/* Big Box Pane: ISBN Scanner + Cart + Preview */}
      <section className="md:col-span-2 flex flex-col min-h-[500px] rounded-2xl border border-white/20 bg-white/5 backdrop-blur overflow-hidden">
        
        {/* Top: ISBN Scanner (Full Width) */}
        <div className="p-4 border-b border-white/10">
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Scan or type ISBN..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-2
                       text-white placeholder:text-white/30 focus:outline-none 
                       focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all font-mono text-sm shadow-inner"
            autoFocus
          />
        </div>

        {/* Middle: Cart + Book Preview */}
        <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10">
          
          {/* Left: Cart Items */}
          <div className="md:w-1/3 p-4 flex flex-col">
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4 font-mono">Cart ({cart.length})</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
              {cart.length === 0 ? (
                <p className="text-sm text-white/20 italic text-center mt-10">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item.isbn} className="flex gap-3 p-2 rounded-xl bg-white/5 border border-white/5 relative group animate-in fade-in slide-in-from-left-4">
                    <img 
                      src={item.coverUrl} 
                      alt={item.title} 
                      className="w-12 h-16 rounded-md object-cover shadow-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.title}</p>
                      <p className="text-xs text-white/60">{item.quantity} x {item.price || 0} AED</p>
                      <p className="text-xs font-bold text-white/80">{(item.price || 0) * item.quantity} AED</p>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.isbn)}
                      className="absolute text-xs bottom-1 right-1 p-1 rounded-full bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/40"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Book Preview */}
          <div className="md:w-2/3 p-6 flex flex-col justify-center bg-white/[0.02]">
            {!book && !isLoading && !isError && (
              <div className="text-center text-white/30 italic font-mono text-sm">
                SCAN ISBN TO START
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center gap-3 text-white/60">
                <div className="w-8 h-8 border-4 border-white/10 border-t-white rounded-full animate-spin" />
                <span>Searching archives...</span>
              </div>
            )}

            {isError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-center">
                {error?.message || "Error looking up book"}
              </div>
            )}

            {book && !isLoading && (
              <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
                {book.coverUrl && (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-44 h-auto rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] object-cover ring-1 ring-white/20 mb-6"
                  />
                )}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-tighter ${
                    book.source === 'local' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {book.source === 'local' ? 'AVAILABLE' : 'OFF-STOCK'}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1 leading-tight">{book.title}</h2>
                <p className="text-lg text-white/50 mb-6">{book.authors?.join(", ")}</p>
                
                {book.source === 'local' ? (
                  <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                    <div className="flex items-center justify-center gap-3 w-full">
                      {/* Price Display */}
                      <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center min-w-[100px]">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Price</p>
                        <p className="text-xl font-mono text-white">{book.price || 0} AED</p>
                      </div>

                      {/* Stock Display */}
                      <div className="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-center min-w-[100px]">
                        <p className="text-[10px] text-white/30 uppercase font-bold tracking-widest mb-1">Stock Left</p>
                        <p className={`text-xl font-mono transition-colors duration-300 ${stockColorClass}`}>
                          {book.stock}
                        </p>
                      </div>

                      {/* Apple Style Quantity Control (Split Rounded Square) */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-20 h-18 rounded-2xl backdrop-blur-md border border-white/10 flex overflow-hidden">
                          {/* Number Side (Left) */}
                          <div className="flex-1 flex items-center justify-center border-r border-white/10">
                            <span className="text-2xl font-mono text-white">{quantity}</span>
                          </div>
                          
                          {/* Controls Side (Right) */}
                          <div className="w-7 flex flex-col">
                            <button 
                              onClick={() => setQuantity(prev => (book && book.source === "local") ? Math.min(prev + 1, book.stock) : prev + 1)}
                              className="flex-1 flex items-center justify-center hover:bg-white/10 text-white transition-colors border-b border-white/10"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => setQuantity(prev => Math.max(prev - 1, 1))}
                              className="flex-1 flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 w-full mt-2 justify-center">
                      <Button 
                        variant="secondary"
                        onClick={() => {
                          setIsbn("");
                          setSearchISBN("");
                          setQuantity(1);
                        }}
                        className="flex-1 h-14"
                      >
                        <span className="px-3">
                          Cancel
                          </span>
                      </Button>
                      <Button 
                        variant="primary"
                        onClick={addToCart}
                        disabled={!canAddToCart}
                        className="flex-[2] h-14"
                      >
                        <span className="px-3">
                          Add to Cart
                          </span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 max-w-sm mt-2">
                    <p className="font-medium flex items-center justify-center gap-2">
                      <span>⚠️</span> Not in local inventory
                    </p>
                    <p className="text-xs text-amber-300/70 mt-1">
                      Add to inventory before selling.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Total Price */}
        <div className="bg-white/10 border-t border-white/10 p-5 flex justify-between items-center backdrop-blur-3xl shadow-2xl">
          <span className="text-white/40 font-mono text-sm tracking-widest uppercase">SUBTOTAL</span>
          <span className="text-3xl font-bold text-white tracking-tight">{totalPrice} AED</span>
        </div>
      </section>

      {/* Sidebar: Customer Name + Actions */}
      <section className="flex flex-col gap-4">
        <div className="flex-1 rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur flex flex-col">
          <h2 className="text-lg font-semibold text-white mb-6 font-mono tracking-tight uppercase border-b border-white/10 pb-4">Details</h2>
          
          <div className="space-y-6 flex-1">
            <div>
              <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-3">
                CUSTOMER NAME (Optional)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter name..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 
                           text-white placeholder:text-white/20 focus:outline-none 
                           focus:ring-2 focus:ring-white/10 focus:bg-white/10 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/30 uppercase tracking-widest mb-3">
                DATE OF PURCHASE
              </label>
              <div className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 
                            text-white/50 font-mono shadow-inner cursor-not-allowed">
                {formatDate(purchaseDate)}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="grid grid-cols-2 gap-3 pb-2">
              <Button 
                variant="secondary"
                onClick={() => navigate("/")}
                className="w-full h-14"
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                onClick={handleProcessSale}
                disabled={cart.length === 0 || isProcessing}
                className="w-full h-14"
              >
                {isProcessing ? (
                   <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  "Process Order"
                )}
              </Button>
            </div>
            <p className="text-[10px] text-white/20 text-center uppercase tracking-widest">RAKC Bookstore POS System</p>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {showCheckoutModal && (
        <CheckoutModal
          totalAmount={totalPrice}
          customerName={customerName}
          onClose={() => setShowCheckoutModal(false)}
          onConfirm={handleCheckoutConfirm}
        />
      )}
    </div>
  );
}
