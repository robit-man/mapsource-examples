"""Python 3.10+; standard library only. Credentials stay in environment/headers."""
import argparse
import json
import math
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # Never forward the subscriber key to a redirect target.

def feature_query(category, bbox, limit=100):
    selectors = {"cafes": '["amenity"="cafe"]', "buildings": '["building"]', "parks": '["leisure"="park"]'}
    if category not in selectors or len(bbox) != 4 or not all(math.isfinite(v) for v in bbox):
        raise ValueError("Invalid category or bounding box.")
    s, w, n, e = bbox
    if not (-85 <= s < n <= 85 and -180 <= w < e <= 180 and n-s <= .5 and e-w <= .5 and isinstance(limit, int) and 1 <= limit <= 500):
        raise ValueError("Use an ordered bbox at most 0.5 degrees per axis and limit 1..500.")
    return f'[out:json][timeout:30];nwr{selectors[category]}({",".join(map(str, bbox))});out geom {limit};'

def request(path, body=None, authenticated=True):
    base = os.getenv("MAPSOURCE_BASE_URL", "https://api.mapsource.io")
    parsed = urllib.parse.urlsplit(base)
    if parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path.rstrip("/") not in ("", "/api") or not (parsed.scheme == "https" or parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1")):
        raise ValueError("Use an HTTPS origin, or loopback HTTP for development.")
    # Paths are relative to the API host (or https://mapsource.io/api); the key
    # is only ever sent under that base.
    if not path.startswith("/") or path.startswith("//") or ".." in path:
        raise ValueError("Only Mapsource API paths are permitted.")
    headers = {"Accept": "application/json", "User-Agent": "Mapsource-Examples/0.1 (+https://github.com/robit-man/mapsource-examples)"}
    if authenticated:
        key = os.getenv("MAPSOURCE_API_KEY")
        if not key:
            raise ValueError("Set MAPSOURCE_API_KEY in the environment; subscribe at https://mapsource.io/pricing.")
        headers["Authorization"] = f"Bearer {key}"
    if body is not None:
        headers["Content-Type"] = "text/plain"
    req = urllib.request.Request(base.rstrip("/") + path, data=body.encode() if body is not None else None, headers=headers)
    try:
        with urllib.request.build_opener(NoRedirect).open(req, timeout=40) as response:
            data = response.read(16 * 1024 * 1024 + 1)
            if len(data) > 16 * 1024 * 1024:
                raise ValueError("Response exceeds 16 MiB; narrow the query.")
            return json.loads(data), response.headers
    except urllib.error.HTTPError as error:
        raise ValueError(f"Mapsource HTTP {error.code}; Retry-After={error.headers.get('Retry-After', 'none')}. No automatic retry or payment.") from None

def features(category, bbox):
    query = feature_query(category, bbox)
    status, _ = request("/status", authenticated=False)
    engine = status.get("engine", {})
    allow_fixture = os.getenv("ALLOW_FIXTURE") == "true"
    if not (engine.get("mode") == "overpass" and engine.get("ready")) and not (allow_fixture and engine.get("mode") == "fixture"):
        raise ValueError("Planet queries are not ready; check /status. ALLOW_FIXTURE=true permits labeled test objects only.")
    data, headers = request("/interpreter", body=query)
    mode = headers.get("X-Overpass-Engine-Mode")
    if mode != "overpass" and not allow_fixture:
        raise ValueError("The response did not come from the planet engine.")
    if not isinstance(data.get("elements"), list) or data.get("remark"):
        raise ValueError("Incomplete Overpass response; narrow bounds.")
    return {"engineMode": mode, "data": data}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("task", choices=["status", "catalog", "cafes", "buildings", "parks", "elevation"])
    parser.add_argument("coordinates", type=float, nargs="*")
    args = parser.parse_args()
    if args.task in ("status", "catalog"):
        result, _ = request("/status" if args.task == "status" else "/tiles/catalog", authenticated=False)
    elif args.task == "elevation":
        if len(args.coordinates) != 2:
            parser.error("elevation requires LAT LON")
        lat, lon = args.coordinates
        if not (math.isfinite(lat) and math.isfinite(lon) and abs(lat) <= 85.05112878 and abs(lon) <= 180):
            raise ValueError("Invalid coordinates.")
        result, _ = request(f"/elevation?lat={lat}&lon={lon}")
    else:
        result = features(args.task, args.coordinates)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    try:
        main()
    except ValueError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except (urllib.error.URLError, TimeoutError):
        # Keep transport exceptions from accidentally serializing credentialed requests.
        print("Request failed. Check coordinates, MAPSOURCE_API_KEY, service readiness, and quota. No automatic payment was attempted.", file=sys.stderr)
        sys.exit(1)
