// Small display converter: relation members remain linework, not assembled
// multipolygon areas. Use a full OSM geometry library for GIS analysis/export.
export function toGeoJSON(data) {
  const features = [];
  for (const element of data.elements || []) {
    const properties = { ...element.tags, osmType: element.type, osmId: element.id };
    const points = geometry => (geometry || []).filter(p => Number.isFinite(p?.lon) && Number.isFinite(p?.lat)).map(p => [p.lon, p.lat]);
    let geometry;
    if (element.type === 'node' && Number.isFinite(element.lat) && Number.isFinite(element.lon)) geometry = { type: 'Point', coordinates: [element.lon, element.lat] };
    if (element.type === 'way') {
      const coordinates = points(element.geometry), tags = element.tags || {};
      if (coordinates.length < 2) continue;
      const closed = coordinates.length >= 4 && coordinates[0].every((v, i) => v === coordinates.at(-1)[i]);
      const area = tags.area !== 'no' && (tags.area === 'yes' || tags.building || tags.landuse || tags.leisure === 'park' || tags.natural === 'water');
      geometry = closed && area ? { type: 'Polygon', coordinates: [coordinates] } : { type: 'LineString', coordinates };
    }
    if (element.type === 'relation') {
      const coordinates = (element.members || []).map(m => points(m.geometry)).filter(p => p.length >= 2);
      if (coordinates.length) geometry = { type: 'MultiLineString', coordinates };
    }
    if (geometry) features.push({ type: 'Feature', id: `${element.type}/${element.id}`, properties, geometry });
  }
  return { type: 'FeatureCollection', features };
}
