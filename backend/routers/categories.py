"""
ECoR-OAMS  ·  Asset Category Routes (CR-2026-006)
Dynamic category management. POST/PUT/DELETE restricted to Auditor role.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AssetCategoryModel, Asset
from ..auth import get_current_user, require_role
from ..schemas import AssetCategoryCreate, AssetCategoryUpdate, AssetCategoryResponse

router = APIRouter(prefix="/api/categories", tags=["Asset Categories"])


# ═══════════════════════════════════════════════════════════
#  LIST  (any authenticated user)
# ═══════════════════════════════════════════════════════════

@router.get("", response_model=list[AssetCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all asset categories."""
    return db.query(AssetCategoryModel).order_by(AssetCategoryModel.category_name).all()


# ═══════════════════════════════════════════════════════════
#  CREATE  (Auditor only)
# ═══════════════════════════════════════════════════════════

@router.post("", response_model=AssetCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: AssetCategoryCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("it_admin", "auditor")),
):
    """Create a new asset category. Administrator (it_admin) and Auditor access."""
    existing = db.query(AssetCategoryModel).filter(
        AssetCategoryModel.category_name == data.category_name
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{data.category_name}' already exists",
        )

    category = AssetCategoryModel(category_name=data.category_name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


# ═══════════════════════════════════════════════════════════
#  UPDATE  (Auditor only)
# ═══════════════════════════════════════════════════════════

@router.put("/{category_id}", response_model=AssetCategoryResponse)
def update_category(
    category_id: int,
    data: AssetCategoryUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("it_admin", "auditor")),
):
    """Rename an asset category. Administrator and Auditor access."""
    category = db.query(AssetCategoryModel).filter(
        AssetCategoryModel.category_id == category_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check for name collision
    clash = db.query(AssetCategoryModel).filter(
        AssetCategoryModel.category_name == data.category_name,
        AssetCategoryModel.category_id != category_id,
    ).first()
    if clash:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{data.category_name}' already exists",
        )

    category.category_name = data.category_name
    db.commit()
    db.refresh(category)
    return category


# ═══════════════════════════════════════════════════════════
#  DELETE  (Admin / Auditor)
# ═══════════════════════════════════════════════════════════

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: dict = Depends(require_role("it_admin", "auditor")),
):
    """CR-2026-006: Delete a category. Blocked if assets reference it."""
    category = db.query(AssetCategoryModel).filter(
        AssetCategoryModel.category_id == category_id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Prevent deletion if assets exist in this category
    asset_count = db.query(Asset).filter(Asset.category_id == category_id).count()
    if asset_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete category '{category.category_name}' — {asset_count} asset(s) still reference it. Reassign them first.",
        )

    db.delete(category)
    db.commit()
