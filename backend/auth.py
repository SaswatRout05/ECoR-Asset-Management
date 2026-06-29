"""
ECoR-OAMS  ·  Authentication & Role-Based Access Control
JWT token management, password hashing, RBAC dependencies, MAC validation.
CR-2026-005: Added require_auditor_only dependency.
"""
import re
from datetime import datetime, timedelta
from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import JWT_SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRY_MINUTES
from .models import User

# ── Password hashing ─────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer(auto_error=True)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT Tokens ───────────────────────────────────────────

def create_token(user: User) -> str:
    """Create a JWT with user identity & role embedded."""
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "full_name": user.full_name,
        "emp_id": user.emp_id,
        "exp": datetime.utcnow() + timedelta(minutes=JWT_EXPIRY_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode & validate a JWT.  Raises 401 on failure."""
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )


# ── FastAPI Dependencies ──────────────────────────────────

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Dependency that extracts & validates the current user from the Bearer token."""
    return decode_token(credentials.credentials)


def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that enforces role-based access.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_role("it_admin"))])
    Or:
        user = Depends(require_role("custodian", "it_admin"))
    """
    def _dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}",
            )
        return current_user
    return _dependency


def require_auditor_only():
    """
    CR-2026-005: Ensures only auditors can write to auditor_remarks / auditor_priority_tag.
    Custodians and IT Admins receive 403 Forbidden.
    """
    def _dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user.get("role") != "auditor":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Auditors can modify auditor review fields (auditor_remarks, auditor_priority_tag)",
            )
        return current_user
    return _dependency


# ── Validators ────────────────────────────────────────────

MAC_REGEX = re.compile(r"^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$")


def validate_mac_address(mac: str) -> bool:
    """SR-INT-003: Strict server-side MAC address validation."""
    return bool(MAC_REGEX.match(mac))
