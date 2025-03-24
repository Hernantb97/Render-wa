-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    gupshup_api_key text,
    whatsapp_number text not null,
    plan_type text not null check (plan_type in ('basic', 'premium', 'enterprise')),
    max_concurrent_chats integer,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Add unique constraint to whatsapp_number
ALTER TABLE businesses ADD CONSTRAINT businesses_whatsapp_number_key UNIQUE (whatsapp_number);

-- Create business users table
CREATE TABLE IF NOT EXISTS business_users (
    id uuid primary key default uuid_generate_v4(),
    business_id uuid references businesses(id),
    user_id uuid references auth.users(id),
    role text not null check (role in ('owner', 'admin', 'agent')),
    is_active boolean default true,
    last_login timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- Add unique constraint to business_users
ALTER TABLE business_users ADD CONSTRAINT business_users_business_user_key UNIQUE (business_id, user_id);

-- Add business_id column to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS business_id uuid references businesses(id);

-- Add is_bot_active column to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_bot_active boolean DEFAULT true;

-- Create index for business_id
CREATE INDEX IF NOT EXISTS idx_conversations_business_id ON conversations(business_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can only view their business conversations" ON conversations;

-- Create business-specific policy
CREATE POLICY "Users can only view their business conversations"
    ON conversations
    FOR ALL
    USING (
        business_id IN (
            SELECT b.id 
            FROM businesses b
            JOIN business_users bu ON b.id = bu.business_id
            WHERE bu.user_id = auth.uid()
        )
    ); 