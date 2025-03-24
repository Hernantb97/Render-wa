-- Insert business record
INSERT INTO businesses (
    name,
    whatsapp_number,
    plan_type
) VALUES (
    'Hernán Tenorio',
    '+15557033313',
    'basic'
) ON CONFLICT (whatsapp_number) 
DO UPDATE SET 
    name = EXCLUDED.name,
    plan_type = EXCLUDED.plan_type
RETURNING id;

-- Link user with business
INSERT INTO business_users (
    business_id,
    user_id,
    role
) 
SELECT 
    b.id,
    u.id,
    'owner'
FROM 
    businesses b,
    auth.users u
WHERE 
    b.whatsapp_number = '+15557033313'
    AND u.email = 'hernan.baigts@gmail.com'
ON CONFLICT (business_id, user_id) 
DO UPDATE SET role = EXCLUDED.role; 