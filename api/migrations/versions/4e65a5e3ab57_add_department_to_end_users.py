"""add department to end_users

Revision ID: 4e65a5e3ab57
Revises: a4f2d8c9b731
Create Date: 2026-06-25 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "4e65a5e3ab57"
down_revision = "a4f2d8c9b731"
branch_labels = None
depends_on = None


def upgrade():
    # New column for the OA-sourced department name. Nullable so legacy rows
    # (created before the OA integration) remain valid without backfill.
    with op.batch_alter_table("end_users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("department", sa.String(length=255), nullable=True))


def downgrade():
    with op.batch_alter_table("end_users", schema=None) as batch_op:
        batch_op.drop_column("department")
