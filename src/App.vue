<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { countries } from './data/countries.js';
import { GlobeEngine } from './lib/globe.js';
import { prepareCountry, formatArea, stretchFactor } from './lib/geo.js';

const globeEl = ref(null);
let engine = null;

const selectedId = ref('');
const readout = ref(null); // { lat, lng, stretch }
const autoRotate = ref(true);
const dragged = ref(false);

const byId = new Map(countries.map((c) => [c.id, c]));
const selected = computed(() => byId.get(selectedId.value) || null);

// Классические примеры искажения проекции Меркатора
const presetIds = ['RUS', 'GRL', 'CAN', 'USA', 'BRA', 'AUS', 'IND'];
const presets = presetIds.map((id) => byId.get(id)).filter(Boolean);

const latText = computed(() => (readout.value ? Math.round(readout.value.lat) : 0));
const stretchText = computed(() =>
  readout.value ? readout.value.stretch.toFixed(1).replace('.', ',') : '1,0',
);
// «вау-факт»: во сколько раз проекция Меркатора растягивает страну по ширине
// на её собственной широте (постоянная величина для выбранной страны).
const homeLat = computed(() => (selected.value ? Math.round(Math.abs(selected.value.centroid[1])) : 0));
const homeStretch = computed(() =>
  selected.value ? stretchFactor(selected.value.centroid[1]).toFixed(1).replace('.', ',') : '1,0',
);
const showHomeFact = computed(() => selected.value && Math.abs(selected.value.centroid[1]) > 25);

watch(selectedId, (id) => {
  if (!engine) return;
  const c = byId.get(id);
  dragged.value = false;
  if (!c) {
    engine.clearSelection();
    readout.value = null;
    return;
  }
  engine.selectCountry(prepareCountry(c));
  // останавливаем авто-вращение и разворачиваем глобус к стране
  autoRotate.value = false;
  engine.setAutoRotate(false);
  engine.focusOn(c.centroid[0], c.centroid[1]);
});

function reset() {
  selectedId.value = '';
}

function toggleRotate() {
  autoRotate.value = !autoRotate.value;
  engine.setAutoRotate(autoRotate.value);
}

onMounted(() => {
  engine = new GlobeEngine(globeEl.value);
  engine.init();
  engine.setBaseCountries(countries);
  engine.onMove = (m) => {
    readout.value = m;
    if (m && Math.abs(m.lat - (selected.value?.centroid[1] ?? m.lat)) > 0.5) dragged.value = true;
  };
});

onBeforeUnmount(() => engine && engine.dispose());
</script>

<template>
  <div class="app">
    <div ref="globeEl" class="globe" aria-hidden="true"></div>

    <header class="masthead">
      <h1 class="masthead-title">Моя&nbsp;Планета</h1>
      <p class="masthead-sub">
        Истинные размеры стран на вращающемся глобусе — без искажений плоских карт
      </p>
    </header>

    <main class="panel" aria-label="Управление сравнением размеров стран">
      <section class="panel-block">
        <label class="field-label" for="country">Выберите страну</label>
        <div class="picker">
          <select id="country" v-model="selectedId" class="select">
            <option value="">— страна не выбрана —</option>
            <option v-for="c in countries" :key="c.id" :value="c.id">
              {{ c.ru }}
            </option>
          </select>
          <button v-if="selectedId" class="btn btn-ghost" type="button" @click="reset">
            Сброс
          </button>
        </div>

        <div class="presets" role="group" aria-label="Быстрый выбор">
          <button
            v-for="p in presets"
            :key="p.id"
            type="button"
            class="chip"
            :class="{ 'is-active': selectedId === p.id }"
            @click="selectedId = p.id"
          >
            {{ p.ru }}
          </button>
        </div>
      </section>

      <section v-if="selected" class="panel-block readout">
        <h2 class="readout-name">{{ selected.ru }}</h2>
        <p class="readout-area">
          Реальная площадь: <strong>{{ formatArea(selected.area) }}</strong>
        </p>

        <p v-if="showHomeFact" class="readout-fact">
          На своей широте (<strong>{{ homeLat }}°</strong>) карта Меркатора растягивает
          страну примерно в <strong>{{ homeStretch }}×</strong> по ширине.
        </p>

        <div class="readout-hint" :class="{ 'is-live': dragged }">
          <template v-if="!dragged">
            <span class="hint-dot" aria-hidden="true">✋</span>
            Схватите подсвеченную страну и перетащите её по глобусу.
          </template>
          <template v-else>
            Широта переноса: <strong>{{ latText }}°</strong>.
            На этой широте плоская карта растянула бы страну примерно в
            <strong>{{ stretchText }}×</strong> по ширине — площадь же остаётся прежней.
          </template>
        </div>
      </section>

      <section v-else class="panel-block intro">
        <p>
          На обычной карте Гренландия кажется размером с Африку, а Россия —
          необъятной. Выберите страну и перенесите её к экватору, чтобы увидеть
          настоящий масштаб.
        </p>
      </section>

      <div class="panel-actions">
        <button type="button" class="btn btn-toggle" :aria-pressed="autoRotate" @click="toggleRotate">
          {{ autoRotate ? '⏸ Остановить вращение' : '▶ Вращать планету' }}
        </button>
      </div>
    </main>

    <footer class="credits">
      Границы: Natural&nbsp;Earth (public&nbsp;domain) · my-planet-earth.ru
    </footer>
  </div>
</template>

<style scoped>
.app {
  position: relative;
  height: 100%;
  width: 100%;
}

.globe {
  position: absolute;
  inset: 0;
  cursor: grab;
}
.globe:active {
  cursor: grabbing;
}

/* Заголовок */
.masthead {
  position: absolute;
  top: clamp(16px, 3vw, 34px);
  left: clamp(16px, 3vw, 34px);
  max-width: min(52ch, 60vw);
  pointer-events: none;
}
.masthead-title {
  margin: 0;
  font-size: clamp(28px, 5vw, 54px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.02;
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.55);
}
.masthead-sub {
  margin: 0.5em 0 0;
  font-size: clamp(13px, 1.5vw, 17px);
  color: var(--text-dim);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
}

/* Панель управления */
.panel {
  position: absolute;
  top: 50%;
  right: clamp(16px, 3vw, 34px);
  transform: translateY(-50%);
  width: min(360px, 88vw);
  padding: clamp(16px, 2vw, 22px);
  background: var(--panel);
  border: 1px solid var(--panel-brd);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
}

.picker {
  display: flex;
  gap: 8px;
}

.select {
  flex: 1;
  min-width: 0;
  appearance: none;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid var(--panel-brd);
  background: var(--bg-2);
  color: var(--text);
  font-size: 15px;
  cursor: pointer;
}
.select:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 1px;
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid var(--panel-brd);
  background: transparent;
  color: var(--text-dim);
  font-size: 13px;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
}
.chip:hover {
  color: var(--text);
  border-color: var(--link);
}
.chip.is-active {
  background: var(--accent);
  border-color: var(--accent);
  color: #241000;
  font-weight: 600;
}

.readout-name {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}
.readout-area {
  margin: 0;
  font-size: 15px;
  color: var(--text-dim);
}
.readout-area strong {
  color: var(--accent-2);
}
.readout-fact {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-dim);
}
.readout-fact strong {
  color: var(--accent);
}
.readout-hint {
  font-size: 14px;
  line-height: 1.5;
  padding: 12px;
  border-radius: 12px;
  background: rgba(127, 178, 255, 0.08);
  border: 1px solid var(--panel-brd);
}
.readout-hint.is-live {
  background: rgba(255, 138, 61, 0.1);
  border-color: rgba(255, 138, 61, 0.35);
}
.readout-hint strong {
  color: var(--text);
}
.hint-dot {
  margin-right: 4px;
}

.intro p {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-dim);
}

.panel-actions {
  display: flex;
}
.btn {
  border: 1px solid var(--panel-brd);
  background: var(--bg-2);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease;
}
.btn:hover {
  border-color: var(--link);
}
.btn:focus-visible {
  outline: 2px solid var(--link);
  outline-offset: 1px;
}
.btn-ghost {
  background: transparent;
  padding: 10px 12px;
}
.btn-toggle {
  width: 100%;
}

.credits {
  position: absolute;
  bottom: 10px;
  left: clamp(16px, 3vw, 34px);
  font-size: 11px;
  color: var(--text-dim);
  opacity: 0.75;
  pointer-events: none;
}

/* Планшеты */
@media (max-width: 1080px) {
  .panel {
    width: min(340px, 90vw);
  }
}

/* Телефоны: панель уходит вниз на всю ширину */
@media (max-width: 760px) {
  .masthead {
    max-width: 90vw;
  }
  .panel {
    top: auto;
    bottom: 0;
    right: 0;
    left: 0;
    width: 100%;
    transform: none;
    border-radius: var(--radius) var(--radius) 0 0;
    max-height: 62vh;
    overflow-y: auto;
  }
  .credits {
    display: none;
  }
}
</style>
