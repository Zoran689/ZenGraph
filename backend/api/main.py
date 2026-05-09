"""FastAPI 后端 - 缠论知识图谱"""
import json, os, sys, traceback
from pathlib import Path

# ── 导入 ──────────────────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
from backend.config import HOST, PORT, PROJECT_ROOT
from backend.services.graph_service import GraphService


app = FastAPI(title="缠论知识图谱", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

gs = None


# ==================== 启动/关闭 ====================

@app.on_event("startup")
async def startup():
    global gs
    print("[启动] 初始化图谱服务...")
    gs = GraphService()
    gs.persist()
    print("[启动] 就绪")


@app.on_event("shutdown")
async def shutdown():
    if gs: gs.close()


# ==================== 知识图谱接口 ====================

@app.get("/api/graph/nodes")
def get_nodes():
    return gs.get_all_nodes()

@app.get("/api/graph/edges")
def get_edges():
    return gs.get_all_edges()

@app.get("/api/graph/node/{node_id}")
def get_node(node_id: str):
    return gs.get_node_detail(node_id)

@app.get("/api/graph/search")
def search_nodes(q: str = Query(...)):
    return gs.search_nodes(q)

@app.get("/api/graph/subgraph")
def get_subgraph(node_id: str = Query(...), depth: int = Query(1, ge=1, le=3)):
    return gs.get_subgraph(node_id, depth)

@app.get("/api/graph/path")
def get_path(source: str = Query(...), target: str = Query(...)):
    return gs.get_paths(source, target)

@app.get("/api/graph/stats")
def get_stats():
    return gs.get_stats()


# ==================== 图谱管理 API ====================

class NodeCreate(BaseModel):
    id: str; category: str; description: str = ""
    importance: int = 10; aliases: list = []; color: str = "#888"

class NodeUpdate(BaseModel):
    category: Optional[str] = None; description: Optional[str] = None
    importance: Optional[int] = None; aliases: Optional[list] = None; color: Optional[str] = None

class EdgeCreate(BaseModel):
    source: str; target: str; label: str; weight: int = 1

@app.post("/api/admin/node")
def admin_create_node(req: NodeCreate):
    return gs.create_node(id=req.id, category=req.category, description=req.description,
                          importance=req.importance, aliases=req.aliases, color=req.color)

@app.put("/api/admin/node/{node_id}")
def admin_update_node(node_id: str, req: NodeUpdate):
    updated = gs.update_node(node_id, category=req.category, description=req.description,
                             importance=req.importance, aliases=req.aliases, color=req.color)
    if not updated: raise HTTPException(404, "节点不存在")
    return {"success": True}

@app.delete("/api/admin/node/{node_id}")
def admin_delete_node(node_id: str):
    if not gs.delete_node(node_id): raise HTTPException(404, "节点不存在")
    return {"success": True}

@app.post("/api/admin/edge")
def admin_create_edge(req: EdgeCreate):
    return gs.create_edge(req.source, req.target, req.label, req.weight)

@app.delete("/api/admin/edge")
def admin_delete_edge(source: str = Query(...), target: str = Query(...)):
    if not gs.delete_edge(source, target): raise HTTPException(404, "关系不存在")
    return {"success": True}


# ==================== 图片上传 ====================

IMAGES_DIR = f"{PROJECT_ROOT}/frontend/static/images"
os.makedirs(IMAGES_DIR, exist_ok=True)

@app.post("/api/upload/concept-image")
async def upload_concept_image(file: UploadFile = File(...), concept: str = Form("")):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "只支持图片格式")
    ext = os.path.splitext(file.filename)[1] or ".png"
    safe_name = concept.replace("/", "_").replace(" ", "_")[:30] + ext
    content = await file.read()
    with open(os.path.join(IMAGES_DIR, safe_name), "wb") as f:
        f.write(content)
    return {"success": True, "url": f"/static/images/{safe_name}"}

@app.delete("/api/upload/concept-image")
async def delete_concept_image(concept: str = Query(...)):
    for f in os.listdir(IMAGES_DIR):
        if f.startswith(concept.replace("/", "_").replace(" ", "_")[:30]):
            os.remove(os.path.join(IMAGES_DIR, f))
    return {"success": True}


# ==================== 前端静态文件 ====================

frontend_dir = f"{PROJECT_ROOT}/frontend"
app.mount("/static", StaticFiles(directory=f"{frontend_dir}/static"), name="static")

@app.get("/")
def index():
    return FileResponse(f"{frontend_dir}/templates/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
