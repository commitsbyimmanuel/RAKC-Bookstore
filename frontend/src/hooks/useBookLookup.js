import { useQuery } from "@tanstack/react-query";
import { lookupBookByISBN, searchGlobalBooksByQuery } from "../services/globalBooksAPI";

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

/**
 * Custom hook for searching books globally by query
 * 
 * @param {string} query - The search query
 * @returns {Object} - Query result with data, isLoading, isError, error
 */
export function useGlobalBookSearch(query) {
  return useQuery({
    queryKey: ["globalBookSearch", query],
    queryFn: ({ signal }) => searchGlobalBooksByQuery(query, signal),
    enabled: !!query && query.trim().length >= 3,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
