import { dehydrate, type QueryClient, type QueryKey } from "@tanstack/react-query";

type AnyQuery = { queryKey: QueryKey; queryFn: () => Promise<unknown> };

/**
 * Fetch a page's data during the route loader (on the server for the first visit,
 * in the browser on later navigations) and hand it to the page, so it renders with
 * content immediately instead of showing "Loading…". Failures are ignored: the page
 * then simply fetches in the browser as before.
 */
export async function preloadQueries(queryClient: QueryClient, queries: AnyQuery[]) {
  await Promise.all(queries.map((q) => queryClient.prefetchQuery(q)));
  return dehydrate(queryClient);
}
