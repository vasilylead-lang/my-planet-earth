#!/usr/bin/env bash
#
# Деплой «Моя Планета» на продакшн-сервер.
#
#   ./deploy.sh              — собрать и залить (безопасно, чужие файлы не трогаем)
#   ./deploy.sh --clean      — то же + удалить на сервере файлы, которых нет в dist/
#   ./deploy.sh --dry-run    — показать, что будет залито, ничего не меняя
#   ./deploy.sh --no-build   — залить уже собранный dist/
#
# Переменные окружения переопределяют значения по умолчанию:
#   SSH_HOST=root@example.com REMOTE_DIR=/var/www/site ./deploy.sh
#
set -euo pipefail

SSH_HOST="${SSH_HOST:-root@46.36.216.4}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/my_planet_ea_usr/data/www/my-planet-earth.ru}"
REMOTE_OWNER="${REMOTE_OWNER:-my_planet_ea_usr:my_planet_ea_usr}"
SITE_URL="${SITE_URL:-https://my-planet-earth.ru/}"

cd "$(dirname "$0")"

DO_BUILD=1
DRY_RUN=0
DELETE=0
for arg in "$@"; do
  case "$arg" in
    --no-build) DO_BUILD=0 ;;
    --dry-run)  DRY_RUN=1 ;;
    --clean)    DELETE=1 ;;
    -h|--help)  sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Неизвестный аргумент: $arg" >&2; exit 1 ;;
  esac
done

echo "==> Цель: $SSH_HOST:$REMOTE_DIR"

# 1. Сборка
if [ "$DO_BUILD" -eq 1 ]; then
  echo "==> Сборка (npm run build)"
  npm run build
fi

if [ ! -f dist/index.html ]; then
  echo "ОШИБКА: dist/index.html не найден — сначала соберите проект." >&2
  exit 1
fi

# 2. Проверка соединения (без интерактивного ввода пароля)
echo "==> Проверка SSH"
ssh -o BatchMode=yes -o ConnectTimeout=10 "$SSH_HOST" "test -d '$REMOTE_DIR'" \
  || { echo "ОШИБКА: нет доступа по SSH или каталог $REMOTE_DIR не существует." >&2; exit 1; }

# 3. Заливка
RSYNC_OPTS=(-rlptz --checksum --human-readable --exclude '.DS_Store')
[ "$DRY_RUN" -eq 1 ] && RSYNC_OPTS+=(--dry-run --itemize-changes)
# --clean удаляет на сервере всё, чего нет в dist/. По умолчанию ВЫКЛЮЧЕНО:
# в каталоге сайта лежат файлы, загруженные вручную (иконки и пр.).
[ "$DELETE" -eq 1 ] && RSYNC_OPTS+=(--delete)

[ "$DRY_RUN" -eq 1 ] && echo "==> rsync (пробный запуск)" || echo "==> rsync"
rsync "${RSYNC_OPTS[@]}" -e "ssh -o BatchMode=yes" dist/ "$SSH_HOST:$REMOTE_DIR/"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "==> Пробный запуск завершён, изменений не внесено."
  exit 0
fi

# 4. Права доступа (FastPanel: файлы должны принадлежать пользователю сайта)
echo "==> Права доступа"
ssh -o BatchMode=yes "$SSH_HOST" \
  "chown -R $REMOTE_OWNER '$REMOTE_DIR' && find '$REMOTE_DIR' -type d -exec chmod 755 {} + && find '$REMOTE_DIR' -type f -exec chmod 644 {} +"

# 5. Проверка результата
echo "==> Проверка"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL" || echo "000")
echo "    $SITE_URL -> HTTP $CODE"
[ "$CODE" = "200" ] || echo "    ВНИМАНИЕ: ожидался код 200."

echo "==> Готово."
