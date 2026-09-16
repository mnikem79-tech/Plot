#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Приём заказов с сайтов КИПРОЛ.
Конфигурация с паролями ищется в корне сайта (/opt/kiprol/plot/config.json).
"""

import json
import os
import sys
import logging
import datetime
import smtplib
from email.message import EmailMessage
from http.server import BaseHTTPRequestHandler, HTTPServer

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)

# Ищем config.json сначала в корне /opt/kiprol/plot/, затем в order-backend/
def get_config_path():
    root_cfg = os.path.join(ROOT_DIR, "config.json")
    if os.path.exists(root_cfg):
        return root_cfg
    local_cfg = os.path.join(BACKEND_DIR, "config.json")
    if os.path.exists(local_cfg):
        return local_cfg
    return root_cfg

CONFIG_PATH = get_config_path()

def load_config():
    if not os.path.exists(CONFIG_PATH):
        print(f"Ошибка: не найден файл конфигурации {CONFIG_PATH}")
        print("Создайте config.json в корне проекта на основе config.json.example")
        sys.exit(1)
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)

CFG = load_config()
LOG_FILE = CFG.get("log_file", "/var/log/kiprol-orders.log")

def build_text(data):
    site = data.get("site", "ac")
    lines = [f"Новый заказ с сайта {site}.kiprol.ru", ""]
    fields = [
        ("Товар", data.get("product", "")),
        ("Количество", data.get("quantity", "1")),
        ("Имя", data.get("name", "")),
        ("Телефон", data.get("phone", "")),
        ("Email", data.get("email", "")),
        ("Комментарий", data.get("comment", "")),
    ]
    for label, value in fields:
        if value:
            lines.append(f"{label}: {value}")
    return "\n".join(lines)

def deliver(data):
    mode = CFG.get("mode", "log")
    text = build_text(data)

    if mode == "log":
        os.makedirs(os.path.dirname(os.path.abspath(LOG_FILE)), exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write("=" * 60 + "\n")
            f.write(datetime.datetime.now().isoformat() + "\n")
            f.write(text + "\n")
        logging.info("Заявка записана в лог (режим log): %s", data.get("product"))
        return True, "logged"

    smtp = CFG.get("smtp", {})
    msg = EmailMessage()
    msg["Subject"] = CFG.get("subject", "Новый заказ с сайта КИПРОЛ")
    msg["From"] = smtp.get("from", CFG.get("to"))
    msg["To"] = CFG.get("to")
    if data.get("email"):
        msg["Reply-To"] = data["email"]
    msg.set_content(text)

    host = smtp.get("host")
    if not host:
        raise RuntimeError("SMTP не настроен: заполните config.json")

    port = int(smtp.get("port", 465))
    user = smtp.get("user")
    password = smtp.get("password")

    if port == 465:
        server = smtplib.SMTP_SSL(host, port, timeout=30)
    else:
        server = smtplib.SMTP(host, port, timeout=30)
        server.ehlo()
        if smtp.get("starttls", True):
            server.starttls()
            server.ehlo()
    if user and password:
        server.login(user, password)
    server.send_message(msg)
    server.quit()
    logging.info("Заявка отправлена на %s", CFG.get("to"))
    return True, "sent"

class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path.split("?")[0] != "/order":
            self._json(404, {"ok": False, "error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(length) or b"{}")
        except Exception:
            self._json(400, {"ok": False, "error": "Некорректный запрос"})
            return

        for field in ("name", "phone", "product"):
            if not str(data.get(field, "")).strip():
                self._json(400, {"ok": False, "error": f"Заполните поле «{field}»"})
                return

        try:
            deliver(data)
        except Exception:
            logging.exception("Ошибка отправки заявки")
            self._json(500, {
                "ok": False,
                "error": "Не удалось отправить заявку. Позвоните +7 (927) 212-39-34 или напишите info@kiprol.ru",
            })
            return

        self._json(200, {"ok": True, "message": "Заявка отправлена. Мы свяжемся с вами в ближайшее время."})

    def log_message(self, *_args):
        pass

def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    host = CFG.get("listen", "127.0.0.1")
    port = int(CFG.get("port", 8080))
    logging.info("kiprol-order: слушаю %s:%s (config=%s, mode=%s)", host, port, CONFIG_PATH, CFG.get("mode", "log"))
    HTTPServer((host, port), Handler).serve_forever()

if __name__ == "__main__":
    main()
