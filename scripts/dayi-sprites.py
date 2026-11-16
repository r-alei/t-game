"""Dayı karelerini hazırlar: yeşil fonu siler, kareleri şapkaya göre ana kareye hizalar, WebP yazar.

Kullanım: python scripts/dayi-sprites.py asset-src/dayi-ham client/public/dayi
Ham dosyalar 1.jpg … 7.jpg (Nano Banana çıktısı, düz #00FF00 fon).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

# Ham dosya numarası → kare adı
FRAMES = {7: 'kapali', 2: 'konus1', 4: 'konus2', 1: 'kirp', 3: 'sasir', 6: 'cosku', 5: 'alkis'}
REFERENCE = 7
OUT_SIZE = 768


def key(rgb: np.ndarray) -> np.ndarray:
    """Yeşillik ölçüsünden yumuşak alfa ve yeşil taşma temizliği."""
    f = rgb.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    greenness = g - np.maximum(r, b)  # fon ~230, karakter < 30
    alpha = np.clip((140 - greenness) / 100, 0, 1)
    # Ana gövdeye bağlı olmayan küçük lekeleri at, içteki delikleri doldur
    solid = alpha > 0.5
    labels, n = ndimage.label(solid)
    if n:
        sizes = ndimage.sum(solid, labels, range(1, n + 1))
        keep = np.isin(labels, 1 + np.flatnonzero(sizes > 2000))
        keep = ndimage.binary_fill_holes(keep)
        near = ndimage.binary_dilation(keep, iterations=3)
        alpha = np.where(near, alpha, 0)
        alpha = np.where(keep, np.maximum(alpha, 0.0), alpha)
    # Yeşil taşmayı bastır: g'yi r ve b'nin büyüğüne indir
    spill = np.maximum(g - np.maximum(r, b), 0) * (1 - alpha) + np.maximum(g - np.maximum(r, b) - 10, 0) * alpha
    g2 = g - spill
    out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    return out


def cap_mask(rgba: np.ndarray) -> np.ndarray:
    """Hizalama için kasketin (gri, üst bölge) maskesi."""
    f = rgba[..., :3].astype(np.int16)
    grey = (np.abs(f[..., 0] - f[..., 1]) < 18) & (np.abs(f[..., 1] - f[..., 2]) < 18) & (f[..., 0] > 90) & (f[..., 0] < 200)
    mask = grey & (rgba[..., 3] > 200)
    mask[int(mask.shape[0] * 0.45):] = False
    return mask.astype(np.float32)


def shift_to(ref: np.ndarray, img: np.ndarray) -> tuple[int, int]:
    """İki maske arasındaki kaydırmayı faz korelasyonuyla bulur (dy, dx)."""
    fa, fb = np.fft.fft2(ref), np.fft.fft2(img)
    r = fa * np.conj(fb)
    r /= np.abs(r) + 1e-9
    corr = np.fft.ifft2(r).real
    dy, dx = np.unravel_index(np.argmax(corr), corr.shape)
    h, w = ref.shape
    if dy > h // 2: dy -= h
    if dx > w // 2: dx -= w
    return int(dy), int(dx)


def main(src: Path, dst: Path) -> None:
    dst.mkdir(parents=True, exist_ok=True)
    keyed = {n: key(np.asarray(Image.open(src / f'{n}.jpg').convert('RGB'))) for n in FRAMES}
    ref = cap_mask(keyed[REFERENCE])
    for n, name in FRAMES.items():
        rgba = keyed[n]
        dy, dx = (0, 0) if n == REFERENCE else shift_to(ref, cap_mask(rgba))
        moved = np.roll(rgba, (dy, dx), axis=(0, 1))
        img = Image.fromarray(moved, 'RGBA').resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)
        img.save(dst / f'{name}.webp', 'WEBP', quality=92, method=6)
        print(f'{n}.jpg -> {name}.webp  kaydırma dy={dy} dx={dx}')


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
