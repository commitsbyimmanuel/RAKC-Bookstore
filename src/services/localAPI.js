import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const LOCAL_API_URL = "http://localhost:3001";

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
 * Fetch all payments from local json-server
 * @param {string} status - Optional status filter ("Pending" or "Complete")
 */
export async function fetchPayments(status) {
  const url = status 
    ? `${LOCAL_API_URL}/payments?status=${status}`
    : `${LOCAL_API_URL}/payments`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch payments");
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
 * Hook to fetch payments with optional status filter
 */
export function usePayments(status) {
  return useQuery({
    queryKey: ["payments", status],
    queryFn: () => fetchPayments(status),
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
 * Update payment details in local json-server
 * @param {string} id - The payment ID
 * @param {Object} updateData - Data to update (amount_payed, status, etc.)
 */
export async function updatePayment(id, updateData) {
  const response = await fetch(`${LOCAL_API_URL}/payments/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateData),
  });
  if (!response.ok) {
    throw new Error("Failed to update payment");
  }
  return response.json();
}

/**
 * Hook to update payment
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, ...updateData }) => updatePayment(id, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
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
      // Invalidate books queries to refetch the list
      queryClient.invalidateQueries({ queryKey: ["books"] });
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
    body: JSON.stringify({
      ...saleData,
      soldAt: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to record sale");
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
      // Invalidate sales if we ever display them
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
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

export { fetchAllBooks as default };
