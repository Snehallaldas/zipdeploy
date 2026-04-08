import json
import os

DB_FILE = "jobs.json"


def _read() -> dict:
    """Read all jobs from file."""
    if not os.path.exists(DB_FILE):
        return {}
    with open(DB_FILE) as f:
        return json.load(f)


def _write(data: dict):
    """Write all jobs to file."""
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)


def save_job(job_id: str, site_id: str, url: str, project_type: str):
    """Save a deployment record."""
    data = _read()
    data[job_id] = {
        "job_id": job_id,
        "site_id": site_id,
        "url": url,
        "project_type": project_type
    }
    _write(data)


def get_job(job_id: str) -> dict | None:
    """Get a deployment record by job_id."""
    data = _read()
    return data.get(job_id)


def delete_job(job_id: str):
    """Remove a deployment record."""
    data = _read()
    data.pop(job_id, None)
    _write(data)


def list_jobs() -> list:
    """Return all deployment records."""
    data = _read()
    return list(data.values())