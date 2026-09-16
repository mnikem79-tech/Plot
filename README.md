# НПО КИПРОЛ — поддомены климатического оборудования

Единый шаблон сайта + наполнение по папкам. Всё живёт внутри **/opt/kiprol/plot/**
(корень `/opt/kiprol/` остаётся чистым: там только папка `plot`).

## Структура /opt/kiprol/plot/

```
plot/
├── site/                        ← ЕДИНЫЙ шаблон (Caddy отдаёт его всем 5 поддоменам)
│   ├── index.html               ← один шаблон (наполняется из JSON по имени домена)
│   ├── style.css                ← один стиль (включая мобильную версию)
│   ├── app.js                   ← одна логика (сайт определяется по домену)
│   │
│   ├── ac/                      ← ac.kiprol.ru (промышленные кондиционеры)
│   │   ├── site.json            ← контент страницы: тексты, тема, hero, FAQ, преимущества
│   │   ├── catalog.json         ← товары и ЦЕНЫ
│   │   └── img/                 ← картинки каталога + фоны
│   │
│   ├── tnaw/   site.json + catalog.json + img/   ← воздух–вода
│   ├── tngeo/  ...                              ← геотермальные
│   ├── tnaa/   ...                              ← воздух–воздух
│   └── tnpool/ ...                              ← для бассейнов
│
├── order-backend/               ← приём заявок и отправка на email
│   ├── order.py
│   ├── config.json.example      ← образец настроек (SMTP)
│   └── kiprol-order.service     ← systemd-юнит
├── logs/                        ← сюда пишутся заявки (создаётся при деплое)
├── caddy-kiprol-subdomains.conf ← конфиг Caddy (копируется в /etc/caddy/)
├── deploy.sh                    ← развёртывание
└── README.md
```

## Принцип

- Общее (шаблон, стиль, логика) — в корне `site/`, правится ОДИН раз для всех.
- Своё у каждого поддомена — в своей папке `site/<имя>/`: `site.json` (контент),
  `catalog.json` (товары и цены), `img/` (картинки).
- Папка сайта самодостаточна: чтобы добавить новый поддомен, достаточно
  добавить папку `site/<имя>/` с тремя элементами — общее трогать не нужно.

## Как обновлять (архив кладём в /opt/kiprol/plot/)

```bash
# 1) залейте kiprol-plot.zip на сервер В папку /opt/kiprol/plot/
#    (scp kiprol-plot.zip root@193.233.49.83:/opt/kiprol/plot/   или через FileZilla)

# 2) распакуйте поверх
cd /opt/kiprol/plot
unzip -o kiprol-plot.zip

# 3) примените
bash /opt/kiprol/plot/deploy.sh
```

После этого сайты: `https://ac.kiprol.ru/`, `https://tnaw.kiprol.ru/` и т.д.

## Первый запуск: настройка email

При первом деплое скрипт создаст `order-backend/config.json` из `config.json.example`
(режим `"log"` — заявки пишутся в `logs/orders.log`). Чтобы письма уходили на почту:

```bash
nano /opt/kiprol/plot/order-backend/config.json   # заполнить блок smtp, mode: "smtp"
systemctl restart kiprol-order
```

## Как менять

| Что | Где |
|---|---|
| Цены, товары, фото, характеристики | `site/<сайт>/catalog.json` |
| Тексты, заголовки, FAQ, цвет темы | `site/<сайт>/site.json` |
| Картинки | `site/<сайт>/img/` |
| Дизайн и мобильная версия (для всех сразу) | `site/style.css` |
| Поведение/логика | `site/app.js` |

Правки в JSON вступают в силу сразу (страница читает файлы при загрузке).
Акцентный цвет поддомена задаётся полями `accent`/`accent2` в site.json.

## Проверка

```bash
curl -I https://ac.kiprol.ru/
curl -s -X POST https://ac.kiprol.ru/order -H 'Content-Type: application/json' \
  -d '{"name":"Тест","phone":"+7 900","product":"Тест"}'
tail -f /opt/kiprol/plot/logs/orders.log
```
