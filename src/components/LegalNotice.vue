<script setup>
// Форма согласия на веб-аналитику (баннер + подробная форма с галочками).
import {
  policyOpen, decided, consent,
  openPolicy, closePolicy, saveConsent, acceptAll, rejectAll,
} from '../lib/legal.js';
</script>

<template>
  <!-- Баннер: краткий, с понятной целью и выбором -->
  <aside v-if="!decided" class="cookie-bar" role="region" aria-label="Согласие на веб-аналитику">
    <p class="cookie-text">
      Мы хотим собирать <strong>обезличенную статистику посещений</strong>, чтобы понимать,
      какими странами пользуются чаще, и улучшать глобус. Без вашего согласия счётчики
      не загружаются.
    </p>
    <div class="cookie-actions">
      <button type="button" class="btn cookie-btn" @click="openPolicy">Настроить</button>
      <button type="button" class="btn cookie-btn" @click="rejectAll">Отклонить</button>
      <button type="button" class="btn cookie-btn is-primary" @click="acceptAll">Принять</button>
    </div>
  </aside>

  <!-- Подробная форма согласия -->
  <div v-if="policyOpen" class="modal-backdrop" @click.self="closePolicy">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="policy-title">
      <header class="modal-head">
        <h2 id="policy-title" class="modal-title">Согласие на веб-аналитику</h2>
        <button type="button" class="modal-close" aria-label="Закрыть" @click="closePolicy">×</button>
      </header>

      <div class="modal-body">
        <p class="lead">
          Сайт <strong>my-planet-earth.ru</strong> не запрашивает доступ к камере, микрофону,
          геолокации и уведомлениям и не собирает персональные данные — здесь нет форм,
          регистрации и авторизации.
        </p>

        <h3>Зачем это нужно</h3>
        <p>
          Статистика показывает, сколько людей открывают глобус, какие страны выбирают и на
          каких шагах уходят. Это нужно, чтобы исправлять ошибки и развивать сайт.
          Согласие <strong>необязательно</strong>: глобус полностью работает и без него.
        </p>

        <h3>Какие данные обрабатываются</h3>
        <ul>
          <li>файлы cookie и идентификатор браузера;</li>
          <li>IP-адрес, город (примерно), тип устройства, браузер, ОС, разрешение экрана;</li>
          <li>источник перехода и просмотренные страницы;</li>
          <li>при согласии на запись действий — движения мыши, клики и прокрутка.</li>
        </ul>

        <h3>Хранение и передача</h3>
        <ul>
          <li><strong>Обработчики:</strong> Google&nbsp;LLC (Google&nbsp;Analytics&nbsp;4, <code>G-VL99Y456DV</code>) и ООО&nbsp;«ЯНДЕКС» (Яндекс.Метрика, счётчик&nbsp;<code>111534910</code>).</li>
          <li><strong>Хранение:</strong> на серверах этих сервисов, по их правилам и срокам.</li>
          <li><strong>Передача:</strong> третьим лицам, кроме указанных сервисов, данные не передаются и не продаются.</li>
          <li><strong>Ваш выбор</strong> хранится локально в браузере (<code>localStorage</code>) и на сервер не отправляется.</li>
        </ul>

        <h3>Ваш выбор</h3>
        <label class="check">
          <input v-model="consent.analytics" type="checkbox" />
          <span>
            <strong>Статистика посещений.</strong>
            Обезличенный подсчёт визитов и источников перехода.
          </span>
        </label>
        <label class="check" :class="{ 'is-disabled': !consent.analytics }">
          <input v-model="consent.webvisor" type="checkbox" :disabled="!consent.analytics" />
          <span>
            <strong>Запись действий на странице (Вебвизор, карта кликов).</strong>
            Яндекс.Метрика записывает движения мыши, клики и прокрутку в пределах сайта.
            Ввод текста не записывается, поскольку полей ввода здесь нет.
          </span>
        </label>

        <p class="note">
          Отозвать согласие можно в любой момент — этой же формой (ссылка
          «Конфиденциальность и cookie» в панели) или очистив cookie в настройках браузера.
          Дополнительно: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer">блокировщик Google&nbsp;Analytics</a>,
          <a href="https://yandex.ru/support/metrica/general/opt-out.html" target="_blank" rel="noreferrer">отказ от Яндекс.Метрики</a>.
        </p>
      </div>

      <footer class="modal-foot">
        <button type="button" class="btn" @click="rejectAll">Отклонить всё</button>
        <button type="button" class="btn is-primary" @click="saveConsent">Сохранить выбор</button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Баннер */
.cookie-bar {
  position: fixed;
  left: clamp(12px, 3vw, 34px);
  bottom: clamp(12px, 3vw, 26px);
  z-index: 40;
  width: min(440px, calc(100vw - 24px));
  padding: 14px 16px;
  border-radius: 14px;
  /* непрозрачный фон: баннер перекрывает панель на узких экранах */
  background: #0c1630;
  border: 1px solid var(--panel-brd);
  box-shadow: var(--shadow);
}
.cookie-text {
  margin: 0 0 12px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-dim);
}
.cookie-text strong {
  color: var(--text);
}
.cookie-actions {
  display: flex;
  gap: 8px;
}
.cookie-btn {
  flex: 1;
  padding: 9px 10px;
  font-size: 13px;
}

/* Модальное окно */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(3, 6, 14, 0.75);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.modal {
  width: min(640px, 100%);
  max-height: min(84vh, 780px);
  display: flex;
  flex-direction: column;
  background: var(--bg-2);
  border: 1px solid var(--panel-brd);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 12px;
  border-bottom: 1px solid var(--panel-brd);
}
.modal-title {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
}
.modal-close {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  border: 1px solid var(--panel-brd);
  background: transparent;
  color: var(--text-dim);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: color 160ms ease, border-color 160ms ease;
}
.modal-close:hover {
  color: var(--text);
  border-color: var(--link);
}
.modal-body {
  overflow-y: auto;
  padding: 16px 20px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-dim);
}
.lead {
  margin: 0 0 4px;
}
.modal-body h3 {
  margin: 18px 0 6px;
  font-size: 14px;
  color: var(--text);
}
.modal-body p,
.modal-body ul {
  margin: 0 0 8px;
}
.modal-body ul {
  padding-left: 18px;
}
.modal-body li {
  margin-bottom: 5px;
}
.modal-body strong {
  color: var(--text);
}
.modal-body code {
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(127, 178, 255, 0.12);
  color: var(--accent-2);
  font-size: 12.5px;
}
.check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin: 10px 0;
  padding: 11px 12px;
  border-radius: 11px;
  border: 1px solid var(--panel-brd);
  background: rgba(127, 178, 255, 0.05);
  cursor: pointer;
}
.check input {
  margin-top: 2px;
  flex: none;
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
  cursor: pointer;
}
.check.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.note {
  margin-top: 14px;
  font-size: 12.5px;
}
.modal-foot {
  padding: 12px 20px 18px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  border-top: 1px solid var(--panel-brd);
}
.is-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: #241000;
  font-weight: 600;
}
.is-primary:hover {
  border-color: var(--accent-2);
}

@media (max-width: 760px) {
  .cookie-bar {
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
  }
  .cookie-actions {
    flex-wrap: wrap;
  }
  .modal-foot {
    flex-direction: column-reverse;
  }
}
</style>
