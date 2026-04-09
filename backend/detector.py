import os
import json


def detect_project(path: str) -> str:
    """
    Walk through extracted project folder and detect project type
    based on signature files.
    """
    files = os.listdir(path)

    # Sometimes ZIP extracts into a subfolder — handle that
    # e.g: myproject.zip → myproject/ → actual files
    if len(files) == 1 and os.path.isdir(os.path.join(path, files[0])):
        path = os.path.join(path, files[0])
        files = os.listdir(path)

    print(f"[Detector] Files found: {files}")  # helpful for debugging

    # ── Next.js ──────────────────────────────────────────────
    if "next.config.js" in files or "next.config.ts" in files:
        return "nextjs"

    # ── React / Node ─────────────────────────────────────────
    if "package.json" in files:
        package_json_path = os.path.join(path, "package.json")
        project_type = _detect_from_package_json(package_json_path)
        return project_type

    # ── Django ───────────────────────────────────────────────
    if "manage.py" in files:
        return "django"

    # ── Flask ────────────────────────────────────────────────
    if "requirements.txt" in files:
        req_path = os.path.join(path, "requirements.txt")
        with open(req_path) as f:
            deps = f.read().lower()
        if "flask" in deps:
            return "flask"
        if "fastapi" in deps:
            return "fastapi"
        if "django" in deps:
            return "django"

    # ── Static HTML ──────────────────────────────────────────────
    # Check for any .html file, not just index.html
    html_files = [f for f in files if f.endswith(".html")]
    if html_files:
        return "static"
    
    # ── Unknown ──────────────────────────────────────────────
    return "unknown"


def _detect_from_package_json(path: str) -> str:
    """Read package.json and detect JS framework from dependencies."""
    try:
        with open(path) as f:
            data = json.load(f)

        # Merge dependencies and devDependencies for checking
        deps = {}
        deps.update(data.get("dependencies", {}))
        deps.update(data.get("devDependencies", {}))

        if "next" in deps:
            return "nextjs"
        if "react" in deps:
            return "react"
        if "vue" in deps:
            return "vue"
        if "svelte" in deps:
            return "svelte"

        return "node"  # generic Node.js project

    except Exception as e:
        print(f"[Detector] Failed to parse package.json: {e}")
        return "node"