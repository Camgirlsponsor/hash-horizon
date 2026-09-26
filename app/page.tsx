import { Dashboard } from "@/components/dashboard";
import { getNetworkSnapshot } from "@/lib/network";

export const revalidate = 30;

export default async function Home() {
  let initialNetwork = null;
  try {
    initialNetwork = await getNetworkSnapshot("bch2");
  } catch {
    /* client will retry */
  }

  return <Dashboard initialNetwork={initialNetwork} />;
}
