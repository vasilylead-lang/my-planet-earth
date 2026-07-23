// Движок глобуса на Three.js. Держим его вне реактивности Vue.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { latLngToVector3, projectCountry, stretchFactor } from './geo.js';

const R = 1; // радиус глобуса в сцене
const BORDER_R = R * 1.0015;
const GRID_R = R * 1.0008;
const GHOST_R = R * 1.004;
const R2D = 180 / Math.PI;

export class GlobeEngine {
  constructor(container) {
    this.container = container;
    this.selected = null; // { prepared }
    this.ghost = null; // THREE.Group
    this.ghostParts = null; // { fills:[{geom}], lines:[{geom}] }
    this.dragging = false;
    this.onMove = null; // callback({ lat, lng, stretch })
    this._raycaster = new THREE.Raycaster();
    this._pointer = new THREE.Vector2();
    this._tmp = new THREE.Vector3();
  }

  init() {
    const { clientWidth: w, clientHeight: h } = this.container;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 100);
    this.camera.position.set(0, 0.6, 3);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.container.appendChild(this.renderer.domElement);

    // свет
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(3, 2, 2);
    this.scene.add(dir);

    // океан
    const ocean = new THREE.Mesh(
      new THREE.SphereGeometry(R, 96, 64),
      new THREE.MeshPhongMaterial({ color: 0x123a6b, emissive: 0x06122b, shininess: 18, specular: 0x21406e }),
    );
    this.ocean = ocean;
    this.scene.add(ocean);

    // атмосфера (лёгкое свечение по краю)
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.03, 64, 48),
      new THREE.MeshBasicMaterial({ color: 0x4a8bff, transparent: true, opacity: 0.08, side: THREE.BackSide }),
    );
    this.scene.add(atmo);

    this._addGraticule();

    // OrbitControls: вращение планеты + авто-вращение
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = 0.5;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.35;
    this.controls.maxDistance = 6;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.45;

    // события указателя. pointerdown слушаем в фазе перехвата на window,
    // чтобы перехватить захват страны раньше, чем сработает OrbitControls.
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    window.addEventListener('pointerdown', this._onDown, true);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('resize', this._onResize);

    this.renderer.setAnimationLoop(this._animate);
  }

  _addGraticule() {
    const pts = [];
    const step = 2; // градусы дискретизации линий
    for (let lat = -80; lat <= 80; lat += 20) {
      for (let lng = -180; lng < 180; lng += step) {
        pts.push(latLngToVector3(lat, lng, GRID_R));
        pts.push(latLngToVector3(lat, lng + step, GRID_R));
      }
    }
    for (let lng = -180; lng < 180; lng += 20) {
      for (let lat = -90; lat < 90; lat += step) {
        pts.push(latLngToVector3(lat, lng, GRID_R));
        pts.push(latLngToVector3(lat + step, lng, GRID_R));
      }
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
    const m = new THREE.LineBasicMaterial({ color: 0x2f5ea0, transparent: true, opacity: 0.28 });
    this.scene.add(new THREE.LineSegments(g, m));
  }

  // Базовые границы всех стран одной геометрией (серые линии).
  setBaseCountries(countries) {
    const pts = [];
    for (const c of countries) {
      for (const poly of c.polygons) {
        for (const ring of poly) {
          for (let i = 0; i < ring.length - 1; i++) {
            const a = latLngToVector3(ring[i][1], ring[i][0], BORDER_R);
            const b = latLngToVector3(ring[i + 1][1], ring[i + 1][0], BORDER_R);
            pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
          }
        }
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.LineBasicMaterial({ color: 0x9ec5ff, transparent: true, opacity: 0.55 });
    this.baseBorders = new THREE.LineSegments(geom, mat);
    this.scene.add(this.baseBorders);
  }

  // Выбор страны: создаём «призрак» в её родной точке.
  selectCountry(prepared) {
    this.clearSelection();
    this.selected = { prepared };

    const group = new THREE.Group();
    const fills = [];
    const lines = [];

    const [lng0, lat0] = prepared.centroid;
    const proj = projectCountry(prepared, lng0, lat0, GHOST_R);

    const fillMat = new THREE.MeshBasicMaterial({
      color: 0xffd24a,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (const f of proj.fills) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(f.positions.slice(), 3));
      geom.setIndex(Array.from(f.indices));
      const mesh = new THREE.Mesh(geom, fillMat);
      mesh.renderOrder = 3;
      group.add(mesh);
      fills.push({ geom });
    }

    const lineMat = new THREE.LineBasicMaterial({ color: 0xff7a1a, linewidth: 2 });
    for (const arr of proj.outlines) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(arr.slice(), 3));
      const line = new THREE.LineLoop(geom, lineMat);
      line.renderOrder = 4;
      group.add(line);
      lines.push({ geom });
    }

    this.ghost = group;
    this.ghostParts = { fills, lines };
    this._fillMeshes = group.children.filter((c) => c.isMesh);
    this.scene.add(group);

    this._emit(lng0, lat0);
  }

  clearSelection() {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    }
    this.ghost = null;
    this.ghostParts = null;
    this.selected = null;
    this._fillMeshes = null;
  }

  // Перепроецирование призрака в точку (lng, lat) без пересоздания геометрий.
  _updateGhost(lng, lat) {
    const proj = projectCountry(this.selected.prepared, lng, lat, GHOST_R);
    proj.fills.forEach((f, i) => {
      const attr = this.ghostParts.fills[i].geom.attributes.position;
      attr.array.set(f.positions);
      attr.needsUpdate = true;
      this.ghostParts.fills[i].geom.computeBoundingSphere();
    });
    proj.outlines.forEach((arr, i) => {
      const attr = this.ghostParts.lines[i].geom.attributes.position;
      attr.array.set(arr);
      attr.needsUpdate = true;
    });
    this._emit(lng, lat);
  }

  _emit(lng, lat) {
    if (this.onMove) this.onMove({ lat, lng, stretch: stretchFactor(lat) });
  }

  _pointerToSphere(ev) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointer, this.camera);
    const hit = this._raycaster.intersectObject(this.ocean, false)[0];
    if (!hit) return null;
    const p = hit.point;
    const lat = Math.asin(THREE.MathUtils.clamp(p.y / p.length(), -1, 1)) * R2D;
    const lng = Math.atan2(-p.z, p.x) * R2D;
    return { lat, lng };
  }

  _onDown = (ev) => {
    if (!this.ghost || ev.button !== 0 || !this._fillMeshes) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    // игнорируем клики вне canvas (например по панели управления)
    if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) {
      return;
    }
    // хватаем страну только если клик пришёлся по её заливке
    this._pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this._pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._pointer, this.camera);
    const hits = this._raycaster.intersectObjects(this._fillMeshes, false);
    if (hits.length) {
      this.dragging = true;
      this.controls.enabled = false;
      this.controls.autoRotate = false;
      this.renderer.domElement.style.cursor = 'grabbing';
      // не даём OrbitControls начать вращение планеты
      ev.stopPropagation();
      ev.stopImmediatePropagation();
    }
  };

  _onPointerMove = (ev) => {
    if (this.dragging) {
      const ll = this._pointerToSphere(ev);
      if (ll) this._updateGhost(ll.lng, ll.lat);
      return;
    }
    // курсор-подсказка при наведении на призрак
    if (this.ghost) {
      const ll = this._pointerToSphere(ev);
      const rect = this.renderer.domElement.getBoundingClientRect();
      this._pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      this._pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      this._raycaster.setFromCamera(this._pointer, this.camera);
      const over = this._fillMeshes && this._raycaster.intersectObjects(this._fillMeshes, false).length;
      this.renderer.domElement.style.cursor = over ? 'grab' : '';
      void ll;
    }
  };

  _onUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.controls.enabled = true;
    this.renderer.domElement.style.cursor = '';
  };

  setAutoRotate(v) {
    if (this.controls) this.controls.autoRotate = v;
  }

  // Плавно развернуть глобус так, чтобы точка (lng,lat) смотрела на зрителя.
  // Двигаем камеру вдоль нормали к поверхности в этой точке (авто-вращение
  // при этом выключено, поэтому конфликта с OrbitControls нет).
  focusOn(lng, lat) {
    const dist = this.camera.position.length();
    // Ограничиваем широту камеры, иначе для полярных стран (Гренландия,
    // Россия) камера уходит почти «над полюсом» и смотрит отвесно вниз.
    const camLat = Math.max(-55, Math.min(55, lat));
    const d = latLngToVector3(camLat, lng, dist);
    this._focusPos = new THREE.Vector3(d.x, d.y, d.z);
  }

  _onResize = () => {
    if (!this.container) return;
    const { clientWidth: w, clientHeight: h } = this.container;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  _animate = () => {
    if (this._focusPos && !this.dragging) {
      this.camera.position.lerp(this._focusPos, 0.1);
      if (this.camera.position.distanceTo(this._focusPos) < 0.01) this._focusPos = null;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointerdown', this._onDown, true);
    this.clearSelection();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
