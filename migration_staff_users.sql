-- ============================================================
-- MIGRACIÓN: Gestión de usuarios staff
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- 1. Agregar columna activo si no existe
ALTER TABLE staff_users 
ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;

-- 2. Agregar columna telefono si no existe
ALTER TABLE staff_users
ADD COLUMN IF NOT EXISTS telefono TEXT;

-- 3. Asegurarse que hay RLS policy para que admins lean staff_users
-- (por defecto Supabase bloquea todo con RLS)

-- Policy: staff autenticado puede ver todos los staff_users
CREATE POLICY IF NOT EXISTS "Staff can view all staff users"
ON staff_users FOR SELECT
TO authenticated
USING (true);

-- Policy: solo super_admin puede insertar/editar/eliminar
-- (esto se controla desde el frontend también, pero como doble seguridad)
CREATE POLICY IF NOT EXISTS "Super admin can manage staff users"
ON staff_users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff_users s
    WHERE s.id = auth.uid()
    AND s.rol = 'super_admin'
    AND s.activo = true
  )
);

-- ============================================================
-- OPCIONAL: Crear el primer super admin manualmente
-- Reemplazá el UUID con el de tu usuario en Authentication > Users
-- ============================================================
-- INSERT INTO staff_users (id, email, nombre, apellido, rol, activo)
-- VALUES (
--   'TU-UUID-AQUI',
--   'tu@email.com',
--   'Tu Nombre',
--   'Tu Apellido',
--   'super_admin',
--   true
-- )
-- ON CONFLICT (id) DO UPDATE SET rol = 'super_admin', activo = true;

-- ============================================================
-- PARA CREAR USUARIOS DESDE EL PANEL (sin service_role):
-- La app usa supabase.auth.signUp() como fallback.
-- Los usuarios nuevos recibirán un email de confirmación.
-- Para omitir la confirmación de email:
-- Authentication > Settings > desactivar "Enable email confirmations"
-- ============================================================
