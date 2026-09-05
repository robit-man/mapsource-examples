# Mapsource examples

Query OpenStreetMap features, render CARTO Dark/Light basemaps, and sample point
elevation with [Mapsource](https://mapsource.io). This is a public client-only
repository. It contains no infrastructure, customer data, keys, or private backend.

Always check [live status](https://mapsource.io/status) before relying on queries.
`engine.mode=fixture` means labeled test objects, **not** global/local OSM results.
The examples refuse fixture queries unless you explicitly set `ALLOW_FIXTURE=true`.
Tiles and elevation are independent companion services; their availability does
not mean the planet Overpass engine is ready.

## Credentials

Get a subscription at [pricing](https://mapsource.io/pricing), then supply
`MAPSOURCE_API_KEY` with your environment/secret manager. Never commit it, paste it
into a URL, embed it in frontend code, or include it in an agent prompt. There is
no key in these examples, no automatic purchase, and no automatic retry.

## TypeScript — Node.js 24+, no install/build required

```sh
node typescript/example.ts status
node typescript/example.ts catalog
node typescript/example.ts cafes 47.60 -122.34 47.62 -122.31
node typescript/example.ts buildings 47.60 -122.34 47.62 -122.31
node typescript/example.ts elevation 45.3735 -121.6959
```

Coordinates are examples; use your own bbox in south, west, north, east order.
Feature helpers cap each bbox axis at 0.5 degrees, timeout at 30 seconds and output
at 100 objects by default (maximum 500). Output count limits are not pagination or
completeness guarantees. Narrow dense queries. Requests honor a 40-second client
timeout and a 16 MiB response ceiling. Handle 429 and `Retry-After` in your app.

## Python — Python 3.10+, standard library only

```sh
python3 python/example.py status
python3 python/example.py cafes 47.60 -122.34 47.62 -122.31
python3 python/example.py buildings 47.60 -122.34 47.62 -122.31
python3 python/example.py elevation 45.3735 -121.6959
```

## Render amenities and buildings on a map

With the key in the server environment, run `npm run map` and open
`http://127.0.0.1:4173`. Choose dark/light, query the visible map, and click to sample
elevation. Pan/zoom is preserved when querying or changing styles. Seattle is the
explicit example starting position, not IP geolocation.

The local server forwards credentials only to the configured Mapsource API origin.
The browser never receives the key. It listens on loopback, checks Host/Origin,
limits concurrency, and exposes only fixed demo routes. **Do not expose or tunnel
this development proxy.** A production app needs its own sessions, per-user quotas,
CSRF policy and authentication. The map library is pinned and loaded from unpkg;
vendor it yourself when operating under an offline/strict third-party policy.

The small GeoJSON converter draws tagged nodes, way polygons/lines and relation
member linework. It does not assemble arbitrary multipolygon relations or perform
topological repair. Use a full OSM geometry library for GIS analysis/export.

## Give to an agent

Read [AGENT-INTEGRATION.md](AGENT-INTEGRATION.md). Discovery is free; protected
tools use the same subscriber key. Supported MCP tools: `service_status`,
`basemap_catalog`, `elevation`, `find_features`, `overpass_query`.

x402 discovery must be checked at runtime. Base Sepolia (`eip155:84532`) is testnet,
not a real-money production payment. These examples never load wallet keys or
authorize payments. A wallet agent needs explicit user-approved spend limits and
must validate network, asset, receiver, amount and receipt.

## Test

```sh
npm test
python3 -m unittest discover -s test -p 'test_*.py'
```

Read [verification](VERIFICATION.md) for measured endpoint checks and limits of the
test evidence. Optional `MAPSOURCE_BASE_URL` must be an HTTPS origin or loopback
HTTP; redirects are refused to prevent credential forwarding.

## Data attribution and limitations

OSM objects: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright),
ODbL. Basemap styling: [CARTO attribution](https://carto.com/attributions); tiles
are rendered images from a separately maintained snapshot, not a replacement for
queryable vector features. Elevation: [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
and underlying source attributions returned by the API. Point elevations use
zoom-12 source tiles; tile zoom is not a uniform ground-resolution/accuracy claim.
Not for safety-critical navigation, surveying or construction decisions.

Example code is MIT licensed. Data and third-party library licenses remain separate.
