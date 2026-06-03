-- Migration to add Gantt Chart and Dependency fields to Tasks table

-- 1. Add start_date column for Gantt Chart timelines
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS start_date DATE NULL;

-- 2. Add depends_on column (Array of UUIDs) to establish task blocking dependencies
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS depends_on UUID[] DEFAULT '{}'::UUID[];

-- Note: Ensure that your frontend code handles these correctly when passing them in inserts/updates.
