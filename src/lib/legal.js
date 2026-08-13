// Общее состояние для юридического уведомления (cookie/аналитика).
import { ref } from 'vue';

const STORAGE_KEY = 'mp-cookie-consent';

export const policyOpen = ref(false);
export const consentGiven = ref(readConsent());

function readConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false; // приватный режим / cookie запрещены — покажем уведомление
  }
}

export function openPolicy() {
  policyOpen.value = true;
}

export function closePolicy() {
  policyOpen.value = false;
}

export function acceptConsent() {
  consentGiven.value = true;
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* хранилище недоступно — уведомление появится снова */
  }
}
