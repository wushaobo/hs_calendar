#!/usr/bin/env python3
"""一次性生成 PWA 图标。只使用 Python 标准库，不安装任何依赖。

运行：python3 tools/make_icons.py
输出：public/icons/*.png
"""

from __future__ import annotations

import binascii
import math
import struct
import zlib
from pathlib import Path

BG = (47, 125, 92)
WHITE = (255, 255, 255)
GREEN = (47, 125, 92)

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "icons"


def inside_rounded_rect(px, py, x0, y0, x1, y1, radius):
    if px < x0 or px > x1 or py < y0 or py > y1:
        return False
    cx = min(max(px, x0 + radius), x1 - radius)
    cy = min(max(py, y0 + radius), y1 - radius)
    dx = px - cx
    dy = py - cy
    return dx * dx + dy * dy <= radius * radius


def segment_distance(px, py, ax, ay, bx, by):
    dx = bx - ax
    dy = by - ay
    length_sq = dx * dx + dy * dy
    if length_sq == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / length_sq
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def color_at(u, v):
    # u/v 是内容盒内的 0..1 坐标。
    in_body = inside_rounded_rect(u, v, 0.14, 0.22, 0.86, 0.86, 0.06)
    if in_body:
        in_header = inside_rounded_rect(u, v, 0.18, 0.245, 0.82, 0.36, 0.035)
        if in_header:
            return GREEN
        check_distance = min(
            segment_distance(u, v, 0.34, 0.60, 0.45, 0.71),
            segment_distance(u, v, 0.45, 0.71, 0.68, 0.47),
        )
        if check_distance <= 0.045:
            return GREEN
        return WHITE

    left_ring = inside_rounded_rect(u, v, 0.30, 0.12, 0.38, 0.26, 0.035)
    right_ring = inside_rounded_rect(u, v, 0.62, 0.12, 0.70, 0.26, 0.035)
    if left_ring or right_ring:
        return WHITE

    return BG


def render(size, content_scale, supersample):
    rows = []
    samples = supersample * supersample
    for py in range(size):
        row = bytearray()
        for px in range(size):
            red = green = blue = 0
            for sy in range(supersample):
                for sx in range(supersample):
                    x = (px * supersample + sx + 0.5) / supersample
                    y = (py * supersample + sy + 0.5) / supersample
                    u = (x / size - 0.5) / content_scale + 0.5
                    v = (y / size - 0.5) / content_scale + 0.5
                    if 0.0 <= u <= 1.0 and 0.0 <= v <= 1.0:
                        color = color_at(u, v)
                    else:
                        color = BG
                    red += color[0]
                    green += color[1]
                    blue += color[2]
            row.extend((red // samples, green // samples, blue // samples))
        rows.append(bytes(row))
    return png_bytes(size, size, rows)


def png_bytes(width, height, rows):
    raw = b"".join(b"\x00" + row for row in rows)
    compressed = zlib.compress(raw, 9)

    def chunk(kind, data):
        checksum = binascii.crc32(kind + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", checksum)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    targets = [
        ("icon-192.png", 192, 0.78, 3),
        ("icon-512.png", 512, 0.78, 2),
        ("icon-maskable-512.png", 512, 0.62, 2),
        ("apple-touch-icon-180.png", 180, 0.78, 3),
        ("favicon-32.png", 32, 0.82, 3),
    ]
    for filename, size, scale, supersample in targets:
        data = render(size, scale, supersample)
        path = OUT_DIR / filename
        path.write_bytes(data)
        print(f"wrote {path.relative_to(OUT_DIR.parent.parent)} ({size}x{size}, {len(data)} bytes)")


if __name__ == "__main__":
    main()
