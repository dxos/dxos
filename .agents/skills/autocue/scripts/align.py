# /// script
# dependencies = ["opencv-python-headless", "numpy"]
# ///
"""Warp a clip so its framing and colour match a reference still: usage align.py <still> <in.mp4> <out.mp4> [frame]."""
import subprocess
import sys

import cv2
import numpy as np

still_path, src, dst = sys.argv[1:4]
probe_index = int(sys.argv[4]) if len(sys.argv) > 4 else 0
W, H = 1280, 720

still = cv2.resize(cv2.imread(still_path), (W, H), interpolation=cv2.INTER_AREA)
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS) or 25
frames = []
while True:
    ok, frame = cap.read()
    if not ok:
        break
    frames.append(cv2.resize(frame, (W, H), interpolation=cv2.INTER_AREA))
cap.release()
probe = frames[min(probe_index, len(frames) - 1)]


def gray(image, scale=0.5):
    small = cv2.resize(image, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, (5, 5), 0)


# Similarity-ish alignment (affine, solved at half size then scaled up) of the probe frame onto the still.
warp = np.eye(2, 3, dtype=np.float32)
criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6)
_, warp = cv2.findTransformECC(gray(still), gray(probe), warp, cv2.MOTION_AFFINE, criteria, None, 5)
warp[:, 2] *= 2
aligned_probe = cv2.warpAffine(probe, warp, (W, H), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)

# Per-channel gain and offset so the clip's colour matches the still, measured away from the edges.
inner = (slice(int(H * 0.1), int(H * 0.9)), slice(int(W * 0.1), int(W * 0.9)))
a = aligned_probe[inner].reshape(-1, 3).astype(np.float32)
b = still[inner].reshape(-1, 3).astype(np.float32)
gain = b.std(0) / np.maximum(a.std(0), 1e-3)
offset = b.mean(0) - a.mean(0) * gain

proc = subprocess.Popen(
    ['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps),
     '-i', '-', '-i', src, '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14',
     '-pix_fmt', 'yuv420p', '-c:a', 'copy', dst],
    stdin=subprocess.PIPE,
)
for frame in frames:
    out = cv2.warpAffine(frame, warp, (W, H), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    out = np.clip(out.astype(np.float32) * gain + offset, 0, 255).astype(np.uint8)
    proc.stdin.write(out.tobytes())
proc.stdin.close()
proc.wait()
scale = float(np.sqrt(abs(np.linalg.det(warp[:, :2]))))
print(f'{src.split("/")[-1]}: scale {scale:.4f} shift ({warp[0, 2]:.1f}, {warp[1, 2]:.1f}) gain {np.round(gain, 3).tolist()}')
