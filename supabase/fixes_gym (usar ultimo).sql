-- ============================================================
-- KROVEX GYM — SQL Fixes
-- Ejecutar en Supabase SQL Editor del proyecto krovex-gym
-- ============================================================

-- FIX 1: auth_id del super admin (ajustar si es necesario)
-- Verificar primero: SELECT id, email FROM auth.users;
-- Luego: SELECT id, auth_id FROM staff_users;
-- Si auth_id es null:
UPDATE staff_users
SET auth_id = (SELECT id FROM auth.users WHERE email = 'danogomezdev@gmail.com')
WHERE auth_id IS NULL AND rol = 'super_admin';

-- FIX 2: PIN de socios demo (password: 1234)
UPDATE members
SET pin_hash = crypt('1234', gen_salt('bf'))
WHERE pin_hash = 'demo_pin_hash' OR pin_hash IS NULL;

-- FIX 3: RLS policies para portal miembro (usuario anónimo)
DROP POLICY IF EXISTS "Allow authenticated" ON member_routines;
CREATE POLICY "member_routines_public" ON member_routines
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "routine_days_public" ON routine_days
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "routine_exercises_public" ON routine_exercises
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "exercises_public" ON exercises
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "routines_public" ON routines
  FOR SELECT USING (true);
