// Геометрия сферы и «истинный размер» (true size).
//
// Идея: контур страны хранится в градусах (долгота, широта). Чтобы честно
// перенести страну в другую точку планеты, мы переводим каждую вершину в
// локальные метрические смещения (восток/север, км) относительно центроида
// страны, а затем «раскладываем» эти же метры в целевой точке. Реальная
// площадь при этом сохраняется — меняется только угловой след на глобусе,
// что и демонстрирует искажение обычных карт.

import earcut from 'earcut';

export const EARTH_R_KM = 6371.0088; // средний радиус Земли
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// Перевод широты/долготы в точку на сфере радиуса `radius`.
// Договорённость осей: +Y — северный полюс, долгота 0° смотрит в +X.
export function latLngToVector3(lat, lng, radius, out) {
  const la = lat * D2R;
  const lo = lng * D2R;
  const cosLa = Math.cos(la);
  const x = radius * cosLa * Math.cos(lo);
  const y = radius * Math.sin(la);
  const z = -radius * cosLa * Math.sin(lo);
  if (out) {
    out.set(x, y, z);
    return out;
  }
  return { x, y, z };
}

// Локальное смещение вершины (км восток/север) относительно центра.
function toLocal(lng, lat, lng0, lat0) {
  const east = (lng - lng0) * D2R * EARTH_R_KM * Math.cos(lat0 * D2R);
  const north = (lat - lat0) * D2R * EARTH_R_KM;
  return [east, north];
}

// Обратный перевод: локальные км -> широта/долгота в целевом центре.
function fromLocal(east, north, lng1, lat1) {
  const lat = lat1 + (north / EARTH_R_KM) * R2D;
  const cos = Math.cos(lat1 * D2R);
  const lng = lng1 + (east / (EARTH_R_KM * Math.max(0.02, cos))) * R2D;
  return [lng, lat];
}

// Ограничиваем целевую широту, чтобы у полюсов cos(lat) не обращался в ноль.
export function clampLat(lat) {
  return Math.max(-85, Math.min(85, lat));
}

const MAX_EDGE_KM = 350; // предел длины ребра треугольника заливки
const MAX_SUBDIV = 4; // предел рекурсии дробления

// Дробим треугольники earcut в локальной (плоской) системе, пока рёбра не
// станут короче MAX_EDGE_KM. Без этого крупные страны «проваливаются» под
// сферу: прямые хорды больших треугольников уходят внутрь глобуса.
function subdivide(verts, baseTris) {
  const tris = [];
  const midCache = new Map();
  const edge2 = MAX_EDGE_KM * MAX_EDGE_KM;

  const dist2 = (a, b) => {
    const dx = verts[a][0] - verts[b][0];
    const dy = verts[a][1] - verts[b][1];
    return dx * dx + dy * dy;
  };
  const mid = (a, b) => {
    const key = a < b ? a * 1e6 + b : b * 1e6 + a;
    let m = midCache.get(key);
    if (m === undefined) {
      m = verts.length;
      verts.push([(verts[a][0] + verts[b][0]) / 2, (verts[a][1] + verts[b][1]) / 2]);
      midCache.set(key, m);
    }
    return m;
  };
  const split = (a, b, c, depth) => {
    if (depth >= MAX_SUBDIV || (dist2(a, b) < edge2 && dist2(b, c) < edge2 && dist2(c, a) < edge2)) {
      tris.push(a, b, c);
      return;
    }
    const ab = mid(a, b);
    const bc = mid(b, c);
    const ca = mid(c, a);
    split(a, ab, ca, depth + 1);
    split(ab, b, bc, depth + 1);
    split(ca, bc, c, depth + 1);
    split(ab, bc, ca, depth + 1);
  };

  for (let i = 0; i < baseTris.length; i += 3) {
    split(baseTris[i], baseTris[i + 1], baseTris[i + 2], 0);
  }
  return tris;
}

// Подготовка страны к перепроецированию: один раз считаем локальные
// координаты вершин и триангуляцию (earcut + дробление) для заливки.
// Топология не меняется при переносе, поэтому вершины переиспользуются.
export function prepareCountry(country) {
  const [clng, clat] = country.centroid;
  const polys = country.polygons.map((poly) => {
    // poly: [outerRing, hole1, hole2, ...]; ring: [[lng,lat], ...]
    const localRings = poly.map((ring) =>
      ring.map(([lng, lat]) => toLocal(lng, lat, clng, clat)),
    );

    // earcut ждёт плоский массив координат + индексы начала дыр
    const flat = [];
    const holeIndices = [];
    const verts = [];
    localRings.forEach((ring, i) => {
      if (i > 0) holeIndices.push(flat.length / 2);
      for (const [e, n] of ring) {
        flat.push(e, n);
        verts.push([e, n]);
      }
    });
    const baseTris = earcut(flat, holeIndices.length ? holeIndices : null, 2);
    const triangles = subdivide(verts, baseTris);

    return { localRings, verts, triangles };
  });

  return { centroid: country.centroid, area: country.area, polys };
}

// Перепроецируем подготовленную страну в целевую точку (lng1, lat1).
// Возвращаем массивы вершин уже на сфере радиуса `radius`:
//  - outlines: массив колец (Float32Array по 3 на вершину) для линий
//  - fills: массив { positions, indices } для заливки
export function projectCountry(prepared, lng1, lat1, radius) {
  const lat = clampLat(lat1);
  const outlines = [];
  const fills = [];

  for (const poly of prepared.polys) {
    // линии контура (по каждому кольцу)
    for (const ring of poly.localRings) {
      const arr = new Float32Array(ring.length * 3);
      for (let i = 0; i < ring.length; i++) {
        const [e, n] = ring[i];
        const [lng, la] = fromLocal(e, n, lng1, lat);
        const v = latLngToVector3(la, lng, radius);
        arr[i * 3] = v.x;
        arr[i * 3 + 1] = v.y;
        arr[i * 3 + 2] = v.z;
      }
      outlines.push(arr);
    }

    // заливка
    const vcount = poly.verts.length;
    const positions = new Float32Array(vcount * 3);
    for (let i = 0; i < vcount; i++) {
      const [e, n] = poly.verts[i];
      const [lng, la] = fromLocal(e, n, lng1, lat);
      const v = latLngToVector3(la, lng, radius);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }
    fills.push({ positions, indices: poly.triangles });
  }

  return { outlines, fills };
}

// Во сколько раз горизонтальный «след» страны на широте lat визуально шире,
// чем на экваторе (1 / cos). Используется для пояснения искажения карт.
export function stretchFactor(lat) {
  const c = Math.cos(clampLat(lat) * D2R);
  return 1 / Math.max(0.02, c);
}

export function formatArea(km2) {
  return km2.toLocaleString('ru-RU') + ' км²';
}
