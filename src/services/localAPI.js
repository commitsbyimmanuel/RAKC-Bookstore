import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
