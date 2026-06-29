"""
ECoR-OAMS Configuration
East Coast Railway Office Asset Management System
"""
import os
from pathlib import Path

# Base directory (project root: ecor-oams/)
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Database ──────────────────────────────────────────────
DATABASE_PATH = BASE_DIR / "ecor_oams.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DATABASE_PATH}")

# ── JWT Authentication ────────────────────────────────────
JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY",
    "ecor-oams-jwt-secret-change-in-production-2026"
)
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_MINUTES = int(os.getenv("JWT_EXPIRY_MINUTES", "480"))  # 8 hours

# ── Application ──────────────────────────────────────────
APP_TITLE = "ECoR-OAMS"
APP_DESCRIPTION = "East Coast Railway Office Asset Management System"
APP_VERSION = "1.0.0"

# ── Frontend Static Files ────────────────────────────────
FRONTEND_DIR = BASE_DIR / "frontend"
