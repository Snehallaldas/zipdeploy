import zipfile
import shutil
import os


def extract_zip(zip_path: str, extract_to: str):
    """Extract ZIP file to a directory."""
    os.makedirs(extract_to, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(extract_to)


def cleanup(*paths):
    """Remove temp files/folders after deployment."""
    for path in paths:
        try:
            if os.path.isfile(path):
                os.remove(path)
            elif os.path.isdir(path):
                shutil.rmtree(path)
        except Exception as e:
            print(f"[Cleanup] Warning: could not remove {path}: {e}")