import os
import uuid
import httpx
import aiofiles
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from detector import detect_project
from deployer import deploy_project, delete_deployment
from database import save_job, get_job, delete_job, list_jobs
from utils import extract_zip, cleanup

load_dotenv()
NETLIFY_TOKEN = os.getenv("NETLIFY_TOKEN")

app = FastAPI(title="ZipDeploy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/deploy")
async def deploy(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are accepted")

    job_id = str(uuid.uuid4())
    zip_path = os.path.join(UPLOAD_DIR, f"{job_id}.zip")
    extract_path = os.path.join(UPLOAD_DIR, job_id)

    async with aiofiles.open(zip_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    extract_zip(zip_path, extract_path)
    project_type = detect_project(extract_path)
    result = await deploy_project(extract_path, project_type, job_id)
    cleanup(zip_path, extract_path)
    os.makedirs(UPLOAD_DIR, exist_ok=True)  # ← add this line

    save_job(job_id, result["site_id"], result["url"], project_type)

    return {
        "job_id": job_id,
        "project_type": project_type,
        "url": result["url"],
        "site_id": result["site_id"],
        "status": "success"
    }


@app.get("/deployments")
def get_deployments():
    return list_jobs()


@app.get("/netlify/sites")
async def get_netlify_sites():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.netlify.com/api/v1/sites",
            headers={"Authorization": f"Bearer {NETLIFY_TOKEN}"}
        )

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch from Netlify")

    sites = response.json()
    return [
        {
            "site_id": s["id"],
            "url": s.get("ssl_url") or s.get("url"),
            "name": s.get("name"),
            "created_at": s.get("created_at")
        }
        for s in sites
    ]


@app.delete("/deploy/job/{job_id}")
async def remove_by_job_id(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    await delete_deployment(job["site_id"])
    delete_job(job_id)

    return {"status": "deleted", "job_id": job_id}


@app.delete("/netlify/sites/{site_id}")
async def remove_by_site_id(site_id: str):
    try:
        await delete_deployment(site_id)
        return {"status": "deleted", "site_id": site_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))