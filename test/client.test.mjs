import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, featureQuery } from '../typescript/client.ts';
import { toGeoJSON } from '../map/geojson.mjs';
test('bounded feature selectors cannot inject QL', () => {
  assert.match(featureQuery('cafes', [47.6, -122.34, 47.62, -122.31]), /amenity.*cafe/);
  for (const bbox of [[], [0,0,1,1], [1,1,0,0], [NaN,0,0,0]]) assert.throws(() => featureQuery('cafes', bbox));
  assert.throws(() => featureQuery('cafes];out;', [0,0,.1,.1]));
});
test('no key in URLs, no external request destinations', async () => {
  assert.throws(() => createClient({ MAPSOURCE_BASE_URL: 'https://secret@example.com' }));
  const client = createClient({});
  await assert.rejects(client.request('//example.com/api/elevation'), /Only Mapsource/);
  await assert.rejects(client.request('/api/elevation'), /Set MAPSOURCE_API_KEY/);
});
test('display converter handles points, building areas, and relation linework', () => {
  const geometry = [{lon:0,lat:0},{lon:1,lat:0},{lon:1,lat:1},{lon:0,lat:0}];
  const fc = toGeoJSON({ elements: [{type:'node',id:1,lat:0,lon:0}, {type:'way',id:2,tags:{building:'yes'},geometry}, {type:'relation',id:3,members:[{geometry}]}] });
  assert.deepEqual(fc.features.map(f => f.geometry.type), ['Point','Polygon','MultiLineString']);
});
