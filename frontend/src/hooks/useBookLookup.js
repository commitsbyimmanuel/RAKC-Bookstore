import { useQuery } from "@tanstack/react-query";
import { lookupBookByISBN } from "../services/globalBooksAPI";

/**
 * Custom hook for looking up a book by ISBN using TanStack Query
 * 
 * @param {string} isbn - The ISBN to lookup
 * @param {Object} options - Additional query options
 * @returns {Object} - Query result with data, isLoading, isError, error, refetch
 */
export function useBookLookup(isbn, options = {}) {
  return useQuery({
    queryKey: ["book", isbn],
    queryFn: () => lookupBookByISBN(isbn),
    enabled: !!isbn && isbn.length >= 10,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: 1,
    ...options,
  });
}

export default useBookLookup;
