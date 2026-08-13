<script setup>
// Уведомление об использовании cookie и систем аналитики + текст политики.
import { policyOpen, consentGiven, openPolicy, closePolicy, acceptConsent } from '../lib/legal.js';
</script>

<template>
  <!-- Баннер согласия -->
  <aside v-if="!consentGiven" class="cookie-bar" role="region" aria-label="Уведомление об использовании cookie">
    <p class="cookie-text">
      Сайт использует файлы cookie и системы веб-аналитики (Google&nbsp;Analytics,
      Яндекс.Метрика с Вебвизором) для сбора обезличенной статистики посещений.
      <button type="button" class="cookie-link" @click="openPolicy">Подробнее</button>
    </p>
    <button type="button" class="btn cookie-accept" @click="acceptConsent">Принять</button>
  </aside>

  <!-- Политика конфиденциальности -->
  <div v-if="policyOpen" class="modal-backdrop" @click.self="closePolicy">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="policy-title">
      <header class="modal-head">
        <h2 id="policy-title" class="modal-title">Конфиденциальность и файлы cookie</h2>
        <button type="button" class="modal-close" aria-label="Закрыть" @click="closePolicy">×</button>
      </header>

      <div class="modal-body">
        <p>
          Сайт <strong>my-planet-earth.ru</strong> носит информационно-познавательный характер.
          Он <strong>не запрашивает и не хранит персональные данные</strong> — здесь нет форм,
          регистрации и авторизации.
        </p>

        <h3>Какие данные собираются</h3>
        <p>
          Автоматически собираются обезличенные технические данные о посещении: файлы cookie,
          IP-адрес, тип устройства, браузер и операционная система, разрешение экрана, источник
          перехода, а также действия на странице (клики, прокрутка).
        </p>

        <h3>Сервисы веб-аналитики</h3>
        <ul>
          <li>
            <strong>Google Analytics 4</strong> (Google&nbsp;LLC), идентификатор
            <code>G-VL99Y456DV</code>.
          </li>
          <li>
            <strong>Яндекс.Метрика</strong> (ООО «ЯНДЕКС»), счётчик <code>111534910</code>.
            Включены <strong>Вебвизор</strong> (запись действий посетителя на странице),
            карта кликов и отслеживание переходов.
          </li>
        </ul>
        <p>
          Данные обрабатываются на условиях, установленных этими сервисами, и используются
          исключительно для анализа посещаемости и улучшения работы сайта.
        </p>

        <h3>Как отказаться</h3>
        <p>
          Вы можете запретить сохранение cookie в настройках браузера или воспользоваться
          официальными средствами отказа:
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer">
            блокировщик Google&nbsp;Analytics</a>,
          <a href="https://yandex.ru/support/metrica/general/opt-out.html" target="_blank" rel="noreferrer">
            отказ от Яндекс.Метрики</a>.
          Отключение cookie не влияет на работу глобуса.
        </p>

        <h3>Данные карт</h3>
        <p>
          Границы стран — Natural&nbsp;Earth (public domain). Данные приведены к 2011 году и
          носят иллюстративный характер.
        </p>
      </div>

      <footer class="modal-foot">
        <button type="button" class="btn" @click="closePolicy">Закрыть</button>
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
  width: min(430px, calc(100vw - 24px));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  /* непрозрачный фон: баннер перекрывает панель и заголовок,
     полупрозрачность делала оба нечитаемыми */
  background: #0c1630;
  border: 1px solid var(--panel-brd);
  box-shadow: var(--shadow);
}
.cookie-text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-dim);
}
.cookie-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--link);
  font-size: inherit;
  text-decoration: underline;
  cursor: pointer;
}
.cookie-accept {
  flex: none;
  padding: 9px 16px;
  font-weight: 600;
}

/* Модальное окно */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(3, 6, 14, 0.72);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
.modal {
  width: min(640px, 100%);
  max-height: min(82vh, 760px);
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
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-dim);
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
.modal-foot {
  padding: 12px 20px 18px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .cookie-bar {
    left: 8px;
    right: 8px;
    bottom: 8px;
    width: auto;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .cookie-accept {
    width: 100%;
  }
}
</style>
