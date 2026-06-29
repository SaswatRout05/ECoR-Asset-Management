"""
ECoR-OAMS  ·  Admin Routes (CR-2026-009)
User CRUD (IT_Admin only) and Lockdown Kill Switch.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from ..auth import get_current_user, require_role, hash_password
from ..schemas import (
    UserCreateRequest, UserUpdateRequest, UserResponse,
    LockdownStatusResponse,
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# ── Global Lockdown State ─────────────────────────────────
# CR-2026-009: In-memory kill switch (resets on server restart)
_lockdown_state = {"is_lockdown": False}


def get_lockdown_state() -> bool:
    """Get current lockdown status (used by middleware)."""
    return _lockdown_state["is_lockdown"]


def set_lockdown_state(value: bool):
    """Set lockdown status."""
    _lockdown_state["is_lockdown"] = value


# ═══════════════════════════════════════════════════════════
#  LOCKDOWN KILL SWITCH
# ═══════════════════════════════════════════════════════════

@router.post("/lockdown", response_model=LockdownStatusResponse)
def toggle_lockdown(
    user: dict = Depends(require_role("it_admin")),
):
    """
    CR-2026-009: Toggle the global lockdown.
    When active, all POST/PUT/PATCH/DELETE requests are blocked (403)
    unless the user is IT_Admin.
    """
    current = get_lockdown_state()
    new_state = not current
    set_lockdown_state(new_state)

    msg = "System LOCKED DOWN — all write operations blocked for non-admin users" if new_state \
        else "System lockdown LIFTED — normal operations resumed"
    return LockdownStatusResponse(is_lockdown=new_state, message=msg)


@router.get("/lockdown", response_model=LockdownStatusResponse)
def get_lockdown(
    user: dict = Depends(get_current_user),
):
    """Get current lockdown status."""
    is_locked = get_lockdown_state()
    msg = "System is in LOCKDOWN mode" if is_locked else "System is operating normally"
    return LockdownStatusResponse(is_lockdown=is_locked, message=msg)


# ═══════════════════════════════════════════════════════════
#  USER CRUD (IT_Admin only)
# ═══════════════════════════════════════════════════════════

@router.get("/users", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("it_admin")),
):
    """List all users in the system."""
    users = db.query(User).order_by(User.id).all()
    result = []
    for u in users:
        result.append(UserResponse(
            id=u.id,
            username=u.username,
            full_name=u.full_name,
            role=u.role.value if hasattr(u.role, "value") else u.role,
            emp_id=u.emp_id,
            is_active=u.is_active if hasattr(u, "is_active") else True,
            created_at=u.created_at,
        ))
    return result


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    data: UserCreateRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("it_admin")),
):
    """Create a new user."""
    # Check for duplicates
    existing = db.query(User).filter(
        (User.username == data.username) | (User.emp_id == data.emp_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or Employee ID already exists",
        )

    new_user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
        emp_id=data.emp_id,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        full_name=new_user.full_name,
        role=new_user.role.value if hasattr(new_user.role, "value") else new_user.role,
        emp_id=new_user.emp_id,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdateRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("it_admin")),
):
    """Update a user's role, is_active, or full_name."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.role is not None:
        target_user.role = data.role
    if data.is_active is not None:
        target_user.is_active = data.is_active
    if data.full_name is not None:
        target_user.full_name = data.full_name

    db.commit()
    db.refresh(target_user)

    return UserResponse(
        id=target_user.id,
        username=target_user.username,
        full_name=target_user.full_name,
        role=target_user.role.value if hasattr(target_user.role, "value") else target_user.role,
        emp_id=target_user.emp_id,
        is_active=target_user.is_active if hasattr(target_user, "is_active") else True,
        created_at=target_user.created_at,
    )
