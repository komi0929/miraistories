-- Add supplemental_info column for soft-gate submission
ALTER TABLE ma_collection_responses ADD COLUMN IF NOT EXISTS supplemental_info TEXT;
