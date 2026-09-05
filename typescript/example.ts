import { createClient } from "./client.ts";

const [task = "status", ...args] = process.argv.slice(2);
const api = createClient();
try {
  let result: unknown;
  if (task === "status") result = await api.json("/api/status", { authenticated: false });
  else if (task === "catalog") result = await api.json("/api/tiles/catalog", { authenticated: false });
  else if (task === "elevation" && args.length === 2) result = await api.elevation(...args.map(Number) as [number, number]);
  else if (["cafes", "buildings", "parks"].includes(task) && args.length === 4) result = await api.features(task, args.map(Number));
  else throw new Error("Usage: node typescript/example.ts status | catalog | elevation LAT LON | cafes/buildings/parks SOUTH WEST NORTH EAST");
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Request failed.");
  process.exitCode = 1;
}
