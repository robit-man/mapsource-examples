# Endpoint verification

Measured 2026-09-05 03:49 UTC from the operator host through public HTTPS at
mapsource.io. Three sequential requests per service; total time to receive the
body, with a securely provided test subscription key. Caches were not cleared.
These are integration probes, not cold-start benchmarks, capacity tests, an SLA,
or representative global-user latency.

| Endpoint | HTTP | Sequential durations (ms) | Result |
| --- | --- | --- | --- |
| `/api/status` | 200 | 99, 33, 28 | degraded; fixture engine |
| `/api/interpreter` | 200 | 44, 46, 38 | four fixture objects, **not planet results** |
| `/api/tiles/dark/0/0/0.png` | 200 | 83, 95, 69 | PNG, 24,254 bytes |
| `/api/tiles/light/0/0/0.png` | 200 | 180, 69, 74 | PNG, 34,536 bytes |
| `/api/elevation?lat=45.3735&lon=-121.6959` | 200 | 539, 45, 40 | 3,410 meters; source zoom 12 |

Elevation response fields actually observed:

```json
{
  "schema": "elevation-query.v1",
  "latitude": 45.3735,
  "longitude": -121.6959,
  "elevationMeters": 3410,
  "resolutionZoom": 12,
  "source": "mapzen-terrain-tiles"
}
```

Attribution returned: Mapzen Terrain Tiles and AWS Open Data. This sampled value
is not a survey-height claim. The first elevation probe took longer than the
following ones; no cache-level attribution was measured.

Unqualified in this run: real global feature results/building footprints from the
planet engine, replication freshness, mainnet x402 settlement and production load
capacity. Always re-read live status instead of treating this dated report as
current readiness.
