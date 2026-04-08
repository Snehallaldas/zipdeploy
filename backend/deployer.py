import os
import shutil
import subprocess
import httpx
from dotenv import load_dotenv

load_dotenv()

NETLIFY_TOKEN = os.getenv("NETLIFY_TOKEN")
NETLIFY_API = "https://api.netlify.com/api/v1"


async def deploy_project(path: str, project_type: str, job_id: str) -> dict:
    if project_type in ("static", "react", "vue", "nextjs", "svelte"):
        return await deploy_to_netlify(path, project_type, job_id)
    else:
        raise Exception(f"Deployment for '{project_type}' not supported yet.")


async def deploy_to_netlify(path: str, project_type: str, job_id: str) -> dict:
    # Build step for JS frameworks
    if project_type in ("react", "vue", "nextjs", "svelte"):
        path = build_js_project(path, project_type)

    zip_output = f"uploads/{job_id}_deploy"
    deploy_zip = shutil.make_archive(zip_output, "zip", path)

    print(f"[Deployer] Deploying {project_type} project to Netlify...")

    site = await create_netlify_site(job_id)
    site_id = site["id"]
    site_url = site["ssl_url"] or site["url"]

    print(f"[Deployer] Site created: {site_url}")

    await upload_zip_to_netlify(site_id, deploy_zip)

    print(f"[Deployer] Deploy complete! URL: {site_url}")

    os.remove(deploy_zip)

    return {"url": site_url, "site_id": site_id}


def build_js_project(path: str, project_type: str) -> str:
    import platform
    npm = "npm.cmd" if platform.system() == "Windows" else "npm"

    # Handle case where ZIP extracts into a subfolder
    files = os.listdir(path)
    if len(files) == 1 and os.path.isdir(os.path.join(path, files[0])):
        path = os.path.join(path, files[0])
        print(f"[Builder] Detected subfolder, building in: {path}")

    print(f"[Builder] Installing dependencies...")
    result = subprocess.run(
        [npm, "install"],
        cwd=path,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        raise Exception(f"npm install failed:\n{result.stderr}")

    print(f"[Builder] Building project...")
    result = subprocess.run(
        [npm, "run", "build"],
        cwd=path,
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        raise Exception(f"npm run build failed:\n{result.stderr}")

    for folder in ("dist", "build", "out", ".next"):
        output_path = os.path.join(path, folder)
        if os.path.isdir(output_path):
            print(f"[Builder] Build output found: {folder}/")
            return output_path

    raise Exception("Build completed but no output folder found (expected dist/ or build/)")
async def create_netlify_site(job_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NETLIFY_API}/sites",
            headers={
                "Authorization": f"Bearer {NETLIFY_TOKEN}",
                "Content-Type": "application/json"
            },
            json={"name": f"zipdeploy-{job_id[:8]}"}
        )

    if response.status_code != 201:
        raise Exception(f"Failed to create Netlify site: {response.text}")

    return response.json()


async def upload_zip_to_netlify(site_id: str, zip_path: str) -> dict:
    with open(zip_path, "rb") as f:
        zip_bytes = f.read()

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{NETLIFY_API}/sites/{site_id}/deploys",
            headers={
                "Authorization": f"Bearer {NETLIFY_TOKEN}",
                "Content-Type": "application/zip"
            },
            content=zip_bytes
        )

    if response.status_code not in (200, 201):
        raise Exception(f"Failed to upload to Netlify: {response.text}")

    return response.json()


async def delete_deployment(site_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{NETLIFY_API}/sites/{site_id}",
            headers={
                "Authorization": f"Bearer {NETLIFY_TOKEN}",
            }
        )

    print(f"[Deployer] Delete response: {response.status_code} - {response.text}")

    if response.status_code not in (200, 204, 404):
        raise Exception(f"Failed to delete site: {response.status_code} - {response.text}")

    return {"deleted": True}