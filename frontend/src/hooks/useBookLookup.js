import { useQuery } from "@tanstack/react-query";
import { lookupBookByISBN, searchGlobalBooksByQuery } from "../services/globalBooksAPI.js";

export function activeBookSearchQuery(input, debouncedQuery) {
  // Leave the previous query immediately; start the next one after debounce.
  return input.trim() === debouncedQuery ? debouncedQuery : "";
}

export function bookLookupQueryOptions(isbn) {
  return {
    queryKey: ["book", isbn],
    queryFn: ({ signal }) => lookupBookByISBN(isbn, signal),
    enabled: !!isbn && isbn.length >= 10,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  };
}

/**
 * Custom hook for looking up a book by ISBN using TanStack Query
 * 
 * @param {string} isbn - The ISBN to lookup
 * @param {Object} options - Additional query options
 * @returns {Object} - Query result with data, isLoading, isError, error, refetch
 */
export function useBookLookup(isbn, options = {}) {
  return useQuery({
    ...bookLookupQueryOptions(isbn),
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
export function globalBookSearchQueryOptions(query) {
  return {
    queryKey: ["globalBookSearch", "latestNonAudioEditions", query],
    queryFn: ({ signal }) => searchGlobalBooksByQuery(query, signal),
    enabled: !!query && query.trim().length >= 3,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  };
}

export function useGlobalBookSearch(query) {
  return useQuery(globalBookSearchQueryOptions(query));
}
