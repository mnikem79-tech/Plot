#!/bin/bash
# Развёртывание поддоменов КИПРОЛ (Ubuntu + Caddy).
# ВСЁ живёт внутри /opt/kiprol/plot/ — корень /opt/kiprol остаётся чистым.
#
# Как обновлять:
#   1) залить kiprol-plot.zip в /opt/kiprol/plot/
#   2) cd /opt/kiprol/plot && unzip -o kiprol-plot.zip
#   3) bash /opt/kiprol/plot/deploy.sh
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"   # = /opt/kiprol/plot
SITE="$SRC/site"
BACKEND="$SRC/order-backend"
CADDY_CONF="/etc/caddy/kiprol-subdomains.conf"
CADDYFILE="/etc/caddy/Caddyfile"

echo "==> 1. Шаблон сайта: $SITE"
[ -d "$SITE" ] || { echo "!! Нет $SITE — архив распакован не туда?"; exit 1; }
chmod -R a+rX "$SITE"

echo "==> 2. Бэкенд заказов: $BACKEND"
mkdir -p "$BACKEND" "$SRC/logs"
chmod 755 "$BACKEND/order.py"
# config.json не перезаписываем, если уже существует (там может быть пароль SMTP)
if [ ! -f "$BACKEND/config.json" ]; then
  cp "$BACKEND/config.json.example" "$BACKEND/config.json" 2>/dev/null || true
fi
chmod 600 "$BACKEND/config.json"

echo "==> 3. systemd-сервис kiprol-order"
cp -f "$BACKEND/kiprol-order.service" /etc/systemd/system/kiprol-order.service
systemctl daemon-reload
systemctl enable kiprol-order >/dev/null 2>&1 || true
systemctl restart kiprol-order

echo "==> 4. Конфиг Caddy"
cp -f "$SRC/caddy-kiprol-subdomains.conf" "$CADDY_CONF"
if ! grep -q 'kiprol-subdomains.conf' "$CADDYFILE"; then
  cp "$CADDYFILE" "$CADDYFILE.bak.$(date +%Y%m%d%H%M%S)"
  printf '\nimport /etc/caddy/kiprol-subdomains.conf\n' >> "$CADDYFILE"
fi

echo "==> 5. Проверка и перезагрузка Caddy"
if caddy validate --config "$CADDYFILE" --adapter caddyfile; then
  systemctl reload caddy
else
  echo "!! Ошибка конфига Caddy — восстановите бэкап Caddyfile.bak.*"
  exit 1
fi

echo "==> 6. Чистка старых файлов от прежних установок (вне plot)"
rm -rf /opt/kiprol/order-backend 2>/dev/null || true      # старая папка бэкенда
rm -rf /opt/kiprol/plot/ac 2>/dev/null || true            # старый одиночный сайт ac
rm -f  /opt/kiprol/deploy.sh /opt/kiprol/README.md \
       /opt/kiprol/caddy-kiprol-subdomains.conf 2>/dev/null || true

echo ""
echo "Готово ✅  Сайты:"
for d in ac tnaw tngeo tnaa tnpool; do echo "  https://$d.kiprol.ru/"; done
echo "Проверка формы:"
echo "  curl -s -X POST https://ac.kiprol.ru/order -H 'Content-Type: application/json' -d '{\"name\":\"Тест\",\"phone\":\"+7 900\",\"product\":\"Тест\"}'"
echo "Заявки: $SRC/logs/orders.log (режим 'log', пока не настроен SMTP)"
