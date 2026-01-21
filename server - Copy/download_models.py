import os, sys, urllib.request

TARGETS = {
    os.path.join("brain", "artifacts", "best_xception.keras"):
        "https://github.com/Abhishek5658/AI_health_care/releases/download/v1-models/brain_best_xception.keras",
    os.path.join("lung", "artifacts", "effnetv2b0_final.keras"):
        "https://github.com/Abhishek5658/AI_health_care/releases/download/v1-models/lung_effnetv2b0_final.keras",
}

def download(url: str, dst: str):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.isfile(dst) and os.path.getsize(dst) > 1_000_000:
        print(f"[models] Exists, skipping: {dst}")
        return
    print(f"[models] Downloading -> {dst}")
    with urllib.request.urlopen(url) as r, open(dst, "wb") as f:
        total = int(r.headers.get("Content-Length", "0"))
        read = 0
        chunk = 1024 * 256
        while True:
            b = r.read(chunk)
            if not b: break
            f.write(b)
            read += len(b)
            if total:
                pct = int(read * 100 / total)
                sys.stdout.write(f"\r  {pct}%"); sys.stdout.flush()
    print("\n[models] Done.")

if __name__ == "__main__":
    for dst, url in TARGETS.items():
        download(url, dst)
