"""add app access permissions

Revision ID: 87cc955248fd
Revises: 4e65a5e3ab57
Create Date: 2026-07-02 12:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "87cc955248fd"
down_revision = "4e65a5e3ab57"
branch_labels = None
depends_on = None


def upgrade():
    # Explicit per-(app, end_user) allowlist. Unique on (app_id, user_id) so
    # one row per (app, end_user). No tenant_id column — app_id is already
    # tenant-scoped via the FK to apps.id, and queries always enter through
    # an App so tenant isolation is preserved without an extra column.
    op.create_table(
        "app_access_permissions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("app_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKey("apps.id", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="app_access_permission_pkey"),
        sa.UniqueConstraint("app_id", "user_id", name="unique_app_access_permission_app_user"),
        sa.Index("app_access_permission_app_idx", "app_id"),
    )

    # Per-app access policy. Default 'allow_all' preserves backward-compat:
    # existing apps behave exactly as before (any end_user may chat).
    # Operators flip to 'deny_all_explicit' to require allowlist rows.
    with op.batch_alter_table("apps", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "access_policy",
                sa.String(length=32),
                nullable=False,
                server_default=sa.text("'allow_all'"),
            )
        )


def downgrade():
    with op.batch_alter_table("apps", schema=None) as batch_op:
        batch_op.drop_column("access_policy")

    op.drop_table("app_access_permissions")