#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Локальный предпросмотр поддоменов КИПРОЛ (для песочницы).
Служит единый шаблон ./site и имитирует успешную отправку /order.
Сайт выбирается параметром ?site=ac|tnaw|tngeo|tnaa|tnpool (по умолчанию ac)."""
import json
import os
import sys
from http.server import SimpleHTTPRequestHandler, HTTPServer

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "site")


class H(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=BASE, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_POST(self):
        if self.path.split("?")[0] == "/order":
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n) or b"{}")
            print("[PREVIEW] Заказ:", data, flush=True)
            body = json.dumps({"ok": True, "message": "Заявка отправлена (предпросмотр). На сервере уйдёт на email."}, ensure_ascii=False).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8081
    print(f"Preview kiprol sites on http://0.0.0.0:{port}  (?site=ac|tnaw|tngeo|tnaa|tnpool)", flush=True)
    HTTPServer(("0.0.0.0", port), H).serve_forever()
