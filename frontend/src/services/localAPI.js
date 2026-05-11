import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const LOCAL_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

/**
 * Fetch all books from local json-server
 */
export async function fetchAllBooks() {
  const response = await fetch(`${LOCAL_API_URL}/books`);
  if (!response.ok) {
    throw new Error("Failed to fetch books");
  }
  return response.json();
}

/**
 * Fetch sales with payment info (replaces old payments endpoint)
 * @param {string} paymentStatus - Optional status filter ("Pending" or "Complete")
 */
export async function fetchPayments(paymentStatus) {
  const url = paymentStatus 
    ? `${LOCAL_API_URL}/sales?paymentStatus=${paymentStatus}`
    : `${LOCAL_API_URL}/sales`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch sales");
  }
  return response.json();
}

/**
 * Fetch pending book requests from local json-server
 */
export async function fetchBookRequests() {
  const response = await fetch(`${LOCAL_API_URL}/bookRequests?fulfilled=false`);
  if (!response.ok) {
    throw new Error("Failed to fetch book requests");
  }
  return response.json();
}

/**
 * Mark a book request as fulfilled
 * @param {number} id - The request ID
 */
export async function fulfillBookRequest(id) {
  const response = await fetch(`${LOCAL_API_URL}/bookRequests/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fulfilled: true,
      fulfilledAt: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to fulfill book request");
  }
  return response.json();
}

/**
 * Hook to fetch all books for stock page
 */
export function useBooks() {
  return useQuery({
    queryKey: ["books"],
    queryFn: fetchAllBooks,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Search local books by query (title, author, isbn)
 */
export async function searchLocalBooks(query) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  const response = await fetch(`${LOCAL_API_URL}/books?search=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error("Failed to search books");
  }
  return response.json();
}

/**
 * Hook to search local books
 */
export function useSearchLocalBooks(query) {
  return useQuery({
    queryKey: ["booksSearch", query],
    queryFn: () => searchLocalBooks(query),
    enabled: !!query && query.trim().length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to fetch payments with optional status filter
 */
export function usePayments(paymentStatus) {
  return useQuery({
    queryKey: ["sales", "payments", paymentStatus],
    queryFn: () => fetchPayments(paymentStatus),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
}

/**
 * Hook to fetch pending book requests
 */
export function useBookRequests() {
  return useQuery({
    queryKey: ["bookRequests"],
    queryFn: fetchBookRequests,
    staleTime: 1000 * 60 * 1, // Cache for 1 minute
  });
}

/**
 * Hook to mark a book request as fulfilled
 */
export function useFulfillBookRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: fulfillBookRequest,
    onSuccess: () => {
      // Invalidate and refetch book requests
      queryClient.invalidateQueries({ queryKey: ["bookRequests"] });
    },
  });
}

/**
 * Create a new book request
 * @param {Object} requestData - The book request data
 */
export async function createBookRequest(requestData) {
  const response = await fetch(`${LOCAL_API_URL}/bookRequests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...requestData,
      fulfilled: false,
      requestedAt: new Date().toISOString(),
      fulfilledAt: null,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to create book request");
  }
  return response.json();
}

/**
 * Update book stock in local json-server
 * @param {string} id - The book's internal ID (not ISBN)
 * @param {number} newStock - The new stock count
 */
export async function updateBookStock(id, newStock) {
  const response = await fetch(`${LOCAL_API_URL}/books/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      stock: newStock,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to update book stock");
  }
  return response.json();
}

/**
 * Hook to update book stock
 */
export function useUpdateBookStock() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, newStock }) => updateBookStock(id, newStock),
    onSuccess: () => {
      // Invalidate books and specific book queries
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["book"] });
    },
  });
}

/**
 * Update book details in local json-server
 * @param {string} id - The book's internal ID
 * @param {Object} updateData - Data to update (stock, location, etc.)
 */
export async function updateBook(id, updateData) {
  const response = await fetch(`${LOCAL_API_URL}/books/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    throw new Error("Failed to update book");
  }
  return response.json();
}

/**
 * Hook to update book details
 */
export function useUpdateBook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...updateData }) => updateBook(id, updateData),
    onSuccess: () => {
      // Invalidate both the books list and individual book queries
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["book"] });
    },
  });
}

/**
 * Update sale payment details
 * @param {string} id - The sale ID
 * @param {Object} updateData - Data to update (amountPaid, paymentStatus, etc.)
 */
export async function updatePayment(id, updateData) {
  const response = await fetch(`${LOCAL_API_URL}/sales/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    throw new Error("Failed to update sale payment");
  }
  return response.json();
}

/**
 * Hook to update sale payment
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...updateData }) => updatePayment(id, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}




/**
 * Add a new book to local json-server
 * @param {Object} bookData - The book data (isbn, title, authors, stock, location, etc.)
 */
export async function addBook(bookData) {
  const response = await fetch(`${LOCAL_API_URL}/books`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bookData),
  });
  if (!response.ok) {
    throw new Error("Failed to add book");
  }
  return response.json();
}

/**
 * Hook to add a new book
 */
export function useAddBook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: addBook,
    onSuccess: () => {
      // Invalidate both the books list and individual book lookups
      queryClient.invalidateQueries({ queryKey: ["books"] });
      queryClient.invalidateQueries({ queryKey: ["book"] });
    },
  });
}


/**
 * Create a new sale record
 * @param {Object} saleData - The sale data (isbn, quantity, customerName, etc.)
 */
export async function createSale(saleData) {
  const response = await fetch(`${LOCAL_API_URL}/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(saleData),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to record sale");
  }
  return response.json();
}

/**
 * Hook to create a new sale
 */
export function useCreateSale() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSale,
    onSuccess: () => {
      // Invalidate sales and top sellers when a new sale is created
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["topSellers"] });
    },
  });
}

/**
 * Fetch top selling books based on sales data
 * @param {number} limit - Number of top sellers to return (default 14)
 */
export async function fetchTopSellers(limit = 14) {
  const response = await fetch(`${LOCAL_API_URL}/sales/top-sellers?limit=${limit}`);
  if (!response.ok) {
    throw new Error("Failed to fetch top sellers");
  }
  return response.json();
}

/**
 * Hook to fetch top selling books
 */
export function useTopSellers(limit = 14) {
  return useQuery({
    queryKey: ["topSellers", limit],
    queryFn: () => fetchTopSellers(limit),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

/**
 * Hook to create a new book request
 */
export function useCreateBookRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createBookRequest,
    onSuccess: () => {
      // Invalidate and refetch book requests
      queryClient.invalidateQueries({ queryKey: ["bookRequests"] });
    },
  });
}

// Note: createPayment is no longer needed as payments are tracked via sales.
// Use createSale instead, which includes paymentStatus and amountPaid fields.

/**
 * Search directory members by name
 * @param {string} query - Search query for member name
 */
export async function searchDirectory(query) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  
  const response = await fetch(`${LOCAL_API_URL}/directory/search?query=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error("Failed to search directory");
  }
  return response.json();
}

/**
 * Hook to search directory members
 */
export function useSearchDirectory(query) {
  return useQuery({
    queryKey: ["directory", query],
    queryFn: () => searchDirectory(query),
    enabled: !!query && query.trim().length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

export { fetchAllBooks as default };


