import { useQuery } from "@tanstack/react-query";
import { getQrPoints } from "@/lib/qrFns";
import { QR_POINTS, toQrPoint, type QrPoint } from "@/lib/campus";

/**
 * Live checkpoints from the database, with the bundled list as initial data so
 * screens render instantly and still work if the DB is unreachable.
 */
export function useQrPoints(): QrPoint[] {
  const { data } = useQuery({
    queryKey: ["qrPoints"],
    queryFn: async () => (await getQrPoints()).map(toQrPoint),
    initialData: QR_POINTS,
    // treat the bundled data as already-stale so the DB is fetched in the
    // background on load (bundled shows instantly, live data replaces it)
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
  });
  return data;
}
