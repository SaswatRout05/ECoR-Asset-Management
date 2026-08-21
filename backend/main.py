"""
ECoR-OAMS  ·  FastAPI Application Entry Point
East Coast Railway Office Asset Management System
CR-2026-009: Added lockdown middleware and admin router.

Run:  python -m uvicorn backend.main:app --reload
Docs: http://localhost:8000/docs
"""
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import APP_TITLE, APP_DESCRIPTION, APP_VERSION, FRONTEND_DIR
from .database import init_db

# ── Router imports ────────────────────────────────────────
from .routers import auth_routes, assets, transfers, metrics, dashboard, search, categories, admin, ai_assistant


# ═══════════════════════════════════════════════════════════
#  App Factory
# ═══════════════════════════════════════════════════════════

app = FastAPI(
    title=APP_TITLE,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (allow all for local dev) ────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── CR-2026-009: Lockdown Middleware ──────────────────────
@app.middleware("http")
async def lockdown_middleware(request: Request, call_next):
    """
    CR-2026-009: If lockdown is active, block all POST/PUT/PATCH/DELETE
    requests unless the user has the 'it_admin' role.
    GET and OPTIONS requests always pass through.
    """
    from .routers.admin import get_lockdown_state
    from .auth import decode_token

    write_methods = {"POST", "PUT", "PATCH", "DELETE"}

    if request.method in write_methods and get_lockdown_state():
        # Try to extract user role from the Authorization header
        auth_header = request.headers.get("authorization", "")
        user_role = None

        if auth_header.startswith("Bearer "):
            try:
                token = auth_header.split(" ", 1)[1]
                payload = decode_token(token)
                user_role = payload.get("role")
            except Exception:
                pass

        # Block if not IT_Admin
        if user_role != "it_admin":
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={
                    "detail": "System is in LOCKDOWN mode. All write operations are blocked. Contact IT Admin."
                },
            )

    return await call_next(request)


# ── Register API routers ─────────────────────────────────
app.include_router(auth_routes.router)
app.include_router(assets.router)
app.include_router(transfers.router)
app.include_router(transfers.singular_router)
app.include_router(metrics.router)
app.include_router(dashboard.router)
app.include_router(search.router)
app.include_router(categories.router)  # CR-2026-006
app.include_router(admin.router)       # CR-2026-009
app.include_router(ai_assistant.router)


# ── Startup: create tables ───────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()


# ═══════════════════════════════════════════════════════════
#  Static File Serving  (Frontend)
# ═══════════════════════════════════════════════════════════

# Mount static sub-directories
if FRONTEND_DIR.exists():
    css_dir = FRONTEND_DIR / "css"
    js_dir = FRONTEND_DIR / "js"
    img_dir = FRONTEND_DIR / "img"

    if css_dir.exists():
        app.mount("/css", StaticFiles(directory=str(css_dir)), name="css")
    if js_dir.exists():
        app.mount("/js", StaticFiles(directory=str(js_dir)), name="js")
    if img_dir.exists():
        app.mount("/img", StaticFiles(directory=str(img_dir)), name="img")


# ── HTML Page Routes ──────────────────────────────────────

def _serve_page(name: str):
    """Serve an HTML page from the frontend directory."""
    path = FRONTEND_DIR / name
    if path.exists():
        return FileResponse(str(path), media_type="text/html")
    return HTMLResponse("<h1>Page not found</h1>", status_code=404)


@app.get("/", include_in_schema=False)
def index():
    return _serve_page("index.html")


@app.get("/dashboard", include_in_schema=False)
def dashboard_page():
    return _serve_page("dashboard.html")


@app.get("/assets", include_in_schema=False)
def assets_page():
    return _serve_page("assets.html")


@app.get("/transfers", include_in_schema=False)
def transfers_page():
    return _serve_page("transfer.html")


@app.get("/categories", include_in_schema=False)
def categories_page():
    return _serve_page("categories.html")


# CR-2026-005: Placeholder pages
@app.get("/faq", include_in_schema=False)
def faq_page():
    return _serve_page("faq.html")


@app.get("/report", include_in_schema=False)
def report_page():
    return _serve_page("report.html")


# CR-2026-008: Archive page for condemned assets
@app.get("/archive", include_in_schema=False)
def archive_page():
    return _serve_page("archive.html")


# CR-2026-009: Admin user management page
@app.get("/admin/users", include_in_schema=False)
def admin_users_page():
    return _serve_page("admin_users.html")
