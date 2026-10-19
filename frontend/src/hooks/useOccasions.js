import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function useOccasions() {
  const [list, setList] = useState([]);
  const reload = useCallback(() => api.get("/occasions").then((r) => setList(r.data)), []);
  useEffect(() => { reload(); }, [reload]);
  return [list, reload];
}
