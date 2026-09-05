const message = document.querySelector('#message');
const map = new maplibregl.Map({ container: 'map', center: [-122.33, 47.61], zoom: 15, style: { version: 8, sources: {}, layers: [] } });
map.addControl(new maplibregl.NavigationControl());
const attribution = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://carto.com/attributions">CARTO</a> · Mapsource';
async function get(url) { const response = await fetch(url); const body = await response.json(); if (!response.ok) throw Error(body.error || `HTTP ${response.status}`); return body; }
function basemap() {
  const style = document.querySelector('#style').value;
  if (map.getLayer('basemap')) map.removeLayer('basemap');
  if (map.getSource('basemap')) map.removeSource('basemap');
  map.addSource('basemap', { type: 'raster', tiles: [`${location.origin}/tiles/${style}/{z}/{x}/{y}.png`], tileSize: 256, maxzoom: 18, attribution });
  map.addLayer({ id: 'basemap', type: 'raster', source: 'basemap' }, map.getLayer('areas') ? 'areas' : undefined);
}
map.on('load', () => {
  basemap();
  map.addSource('features', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({ id: 'areas', type: 'fill', source: 'features', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#94cda7', 'fill-opacity': .4 } });
  map.addLayer({ id: 'lines', type: 'line', source: 'features', filter: ['!=', ['geometry-type'], 'Point'], paint: { 'line-color': '#b4ebc3', 'line-width': 2 } });
  map.addLayer({ id: 'points', type: 'circle', source: 'features', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-color': '#b4ebc3', 'circle-radius': 6, 'circle-stroke-color': '#172019', 'circle-stroke-width': 2 } });
});
document.querySelector('#style').onchange = basemap;
document.querySelector('#query').onclick = async event => {
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const b = map.getBounds();
    const bbox = [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()].join(',');
    const result = await get(`/features?category=${document.querySelector('#category').value}&bbox=${bbox}`);
    map.getSource('features').setData(result.geojson);
    message.textContent = `${result.engineMode === 'fixture' ? 'FIXTURE TEST OBJECTS — not local results. ' : ''}${result.geojson.features.length} display features. Queries do not move the camera. Click for elevation.`;
  } catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
};
map.on('click', async event => {
  try {
    const result = await get(`/elevation?lat=${event.lngLat.lat}&lon=${event.lngLat.lng}`);
    new maplibregl.Popup().setLngLat(event.lngLat).setText(`${result.elevationMeters} m · Mapzen Terrain Tiles`).addTo(map);
  } catch (error) { message.textContent = error.message; }
});
map.on('error', () => { message.textContent = 'Map request failed. Check subscription key, quota, and /status.'; });
try { const s = await get('/status'); message.textContent = `Engine: ${s.engine.mode}; ${s.status}. Query a small viewport; click the map for elevation.`; }
catch (error) { message.textContent = error.message; }
