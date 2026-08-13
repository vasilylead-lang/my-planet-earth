// Согласие на веб-аналитику.
//
// Принцип: до явного согласия НИ ОДИН счётчик не загружается. Скрипты
// подключаются динамически только после выбора пользователя, поэтому
// галочки в форме реально управляют сбором данных, а не «для вида».
import { ref, reactive } from 'vue';

const STORAGE_KEY = 'mp-consent-v2';
const GA_ID = 'G-VL99Y456DV';
const YM_ID = 111534910;

export const policyOpen = ref(false); // окно с формой согласия
export const decided = ref(false); // выбор уже сделан — баннер не нужен

// Раздельные разрешения (см. форму согласия)
export const consent = reactive({
  analytics: false, // обезличенная статистика посещений
  webvisor: false, // запись действий на странице (Вебвизор, карта кликов)
});

let injected = false; // счётчики уже подключены в этом сеансе

restore();

function restore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    consent.analytics = !!saved.analytics;
    consent.webvisor = !!saved.webvisor;
    decided.value = true;
  } catch {
    /* хранилище недоступно — спросим снова */
  }
}

export function openPolicy() {
  policyOpen.value = true;
}

export function closePolicy() {
  policyOpen.value = false;
}

// Сохранить выбор и применить его немедленно.
export function saveConsent() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ analytics: consent.analytics, webvisor: consent.webvisor, ts: Date.now() }),
    );
  } catch {
    /* не критично: спросим в следующий раз */
  }
  decided.value = true;
  policyOpen.value = false;

  if (consent.analytics) {
    inject();
  } else if (injected) {
    // Согласие отозвано, а счётчики уже работают в этой вкладке.
    // Единственный честный способ их выгрузить — перезагрузить страницу.
    location.reload();
  }
}

export function acceptAll() {
  consent.analytics = true;
  consent.webvisor = true;
  saveConsent();
}

export function rejectAll() {
  consent.analytics = false;
  consent.webvisor = false;
  saveConsent();
}

// Подключение счётчиков (вызывается только при согласии).
function inject() {
  if (injected) return;
  injected = true;
  loadGoogleAnalytics();
  loadYandexMetrika();
}

function loadGoogleAnalytics() {
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}

function loadYandexMetrika() {
  /* eslint-disable */
  (function (m, e, t, r, i, k, a) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * new Date();
    for (let j = 0; j < e.scripts.length; j++) { if (e.scripts[j].src === r) return; }
    k = e.createElement(t); a = e.getElementsByTagName(t)[0];
    k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
  })(window, document, 'script', `https://mc.yandex.ru/metrika/tag.js?id=${YM_ID}`, 'ym');
  /* eslint-enable */

  window.ym(YM_ID, 'init', {
    // запись действий и карта кликов — только по отдельному согласию
    webvisor: consent.webvisor,
    clickmap: consent.webvisor,
    trackLinks: true,
    accurateTrackBounce: true,
  });
}

// Применить ранее сохранённое согласие при загрузке страницы.
export function initConsent() {
  if (decided.value && consent.analytics) inject();
}
