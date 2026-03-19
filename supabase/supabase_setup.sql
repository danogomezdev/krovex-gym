-- ============================================================
-- KROVEX GYM SYSTEM — Supabase Setup SQL
-- ============================================================

-- ENUMS
CREATE TYPE membership_status AS ENUM ('activo', 'vencido', 'suspendido', 'baja', 'congelado');
CREATE TYPE payment_method AS ENUM ('efectivo', 'transferencia', 'tarjeta', 'mercadopago', 'otro');
CREATE TYPE payment_status AS ENUM ('pagado', 'pendiente', 'vencido', 'anulado');
CREATE TYPE class_type_enum AS ENUM ('musculacion', 'spinning', 'yoga', 'pilates', 'crossfit', 'natacion', 'funcional', 'otro');
CREATE TYPE equipment_status AS ENUM ('operativo', 'mantenimiento', 'baja');
CREATE TYPE muscle_group AS ENUM ('pecho', 'espalda', 'hombros', 'brazos', 'piernas', 'core', 'gluteos', 'full_body');
CREATE TYPE staff_role AS ENUM ('super_admin', 'admin', 'recepcionista', 'entrenador');
CREATE TYPE booking_status AS ENUM ('confirmada', 'cancelada', 'lista_espera', 'asistio');

-- ============================================================
-- TABLAS PRINCIPALES
-- ============================================================

CREATE TABLE gym_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT 'Mi Gimnasio',
  logo_url TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  horario_apertura TIME DEFAULT '06:00',
  horario_cierre TIME DEFAULT '23:00',
  moneda TEXT DEFAULT 'ARS',
  prefijo_socio TEXT DEFAULT 'KRV',
  tiempo_cancelacion_hs INTEGER DEFAULT 2,
  color_portal TEXT DEFAULT '#2563EB',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefono TEXT,
  rol staff_role NOT NULL DEFAULT 'recepcionista',
  activo BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_socio TEXT UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  fecha_nacimiento DATE,
  direccion TEXT,
  contacto_emergencia_nombre TEXT,
  contacto_emergencia_telefono TEXT,
  foto_url TEXT,
  estado membership_status DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  duracion_dias INTEGER,
  cantidad_clases INTEGER,
  precio NUMERIC(10,2) NOT NULL,
  areas TEXT[],
  activo BOOLEAN DEFAULT TRUE,
  es_familiar BOOLEAN DEFAULT FALSE,
  descuento_familiar NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  clases_restantes INTEGER,
  estado membership_status DEFAULT 'activo',
  congelada_desde DATE,
  congelada_hasta DATE,
  dias_congelados INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  membership_id UUID REFERENCES memberships(id),
  plan_id UUID REFERENCES membership_plans(id),
  monto NUMERIC(10,2) NOT NULL,
  metodo payment_method NOT NULL,
  estado payment_status DEFAULT 'pagado',
  concepto TEXT,
  comprobante_numero TEXT,
  staff_id UUID REFERENCES staff_users(id),
  cash_session_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff_users(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  monto_apertura NUMERIC(10,2) DEFAULT 0,
  monto_cierre NUMERIC(10,2),
  total_efectivo NUMERIC(10,2) DEFAULT 0,
  total_transferencia NUMERIC(10,2) DEFAULT 0,
  total_tarjeta NUMERIC(10,2) DEFAULT 0,
  total_mercadopago NUMERIC(10,2) DEFAULT 0,
  cerrada BOOLEAN DEFAULT FALSE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto TEXT NOT NULL,
  categoria TEXT,
  monto NUMERIC(10,2) NOT NULL,
  fecha DATE DEFAULT CURRENT_DATE,
  staff_id UUID REFERENCES staff_users(id),
  cash_session_id UUID REFERENCES cash_sessions(id),
  comprobante_url TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES staff_users(id),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  especialidades TEXT[],
  bio TEXT,
  foto_url TEXT,
  activo BOOLEAN DEFAULT TRUE,
  comision_por_clase NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trainer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  dia_semana INTEGER NOT NULL, -- 0=Domingo, 1=Lunes...6=Sabado
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL
);

CREATE TABLE class_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo class_type_enum DEFAULT 'otro',
  descripcion TEXT,
  color TEXT DEFAULT '#2563EB',
  icono TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id UUID REFERENCES class_types(id),
  trainer_id UUID REFERENCES trainers(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  fecha_hora TIMESTAMPTZ NOT NULL,
  duracion_minutos INTEGER DEFAULT 60,
  cupo_maximo INTEGER DEFAULT 20,
  cupo_disponible INTEGER DEFAULT 20,
  ubicacion TEXT,
  recurrente BOOLEAN DEFAULT FALSE,
  recurrencia_dias INTEGER[],
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  estado booking_status DEFAULT 'confirmada',
  posicion_espera INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, member_id)
);

CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_users(id),
  class_id UUID REFERENCES classes(id),
  tipo TEXT DEFAULT 'gimnasio', -- 'gimnasio' | 'clase'
  metodo TEXT DEFAULT 'manual', -- 'manual' | 'qr'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  grupo_muscular muscle_group NOT NULL,
  descripcion TEXT,
  gif_url TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  objetivo TEXT,
  nivel TEXT DEFAULT 'intermedio',
  duracion_semanas INTEGER DEFAULT 4,
  created_by UUID REFERENCES staff_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE routine_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  dia_numero INTEGER NOT NULL, -- 1-7
  nombre TEXT NOT NULL, -- 'Lunes - Pecho y Tríceps'
  orden INTEGER DEFAULT 0
);

CREATE TABLE routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_day_id UUID NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  series INTEGER DEFAULT 3,
  repeticiones TEXT DEFAULT '10-12',
  peso TEXT,
  descanso_segundos INTEGER DEFAULT 60,
  notas TEXT,
  orden INTEGER DEFAULT 0
);

CREATE TABLE member_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES routines(id),
  trainer_id UUID REFERENCES trainers(id),
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  activa BOOLEAN DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff_users(id),
  fecha DATE DEFAULT CURRENT_DATE,
  peso NUMERIC(5,2),
  altura NUMERIC(5,2),
  imc NUMERIC(5,2),
  porcentaje_grasa NUMERIC(5,2),
  porcentaje_musculo NUMERIC(5,2),
  cintura NUMERIC(5,2),
  cadera NUMERIC(5,2),
  pecho NUMERIC(5,2),
  brazo_der NUMERIC(5,2),
  brazo_izq NUMERIC(5,2),
  muslo_der NUMERIC(5,2),
  muslo_izq NUMERIC(5,2),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  measurement_id UUID REFERENCES measurements(id),
  foto_url TEXT NOT NULL,
  tipo TEXT DEFAULT 'frente', -- 'frente' | 'lateral' | 'espalda'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  numero_serie TEXT,
  area TEXT,
  estado equipment_status DEFAULT 'operativo',
  fecha_compra DATE,
  ultima_revision DATE,
  proxima_revision DATE,
  valor_compra NUMERIC(10,2),
  notas TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  fecha DATE DEFAULT CURRENT_DATE,
  tipo TEXT, -- 'revision' | 'reparacion' | 'mantenimiento'
  descripcion TEXT,
  costo NUMERIC(10,2),
  tecnico TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT,
  stock_actual INTEGER DEFAULT 0,
  stock_minimo INTEGER DEFAULT 5,
  unidad TEXT DEFAULT 'unidad',
  proveedor TEXT,
  precio_unitario NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  tipo TEXT DEFAULT 'info', -- 'info' | 'alerta' | 'bienvenida' | 'deuda'
  leida BOOLEAN DEFAULT FALSE,
  staff_id UUID REFERENCES staff_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE membership_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  motivo TEXT,
  aprobado_por UUID REFERENCES staff_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX idx_members_dni ON members(dni);
CREATE INDEX idx_members_estado ON members(estado);
CREATE INDEX idx_memberships_member_id ON memberships(member_id);
CREATE INDEX idx_memberships_estado ON memberships(estado);
CREATE INDEX idx_memberships_vencimiento ON memberships(fecha_vencimiento);
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_attendance_member_id ON attendance(member_id);
CREATE INDEX idx_attendance_created_at ON attendance(created_at);
CREATE INDEX idx_classes_fecha_hora ON classes(fecha_hora);
CREATE INDEX idx_class_bookings_class_id ON class_bookings(class_id);
CREATE INDEX idx_class_bookings_member_id ON class_bookings(member_id);

-- ============================================================
-- FUNCIONES RPC
-- ============================================================

-- Login de miembro con DNI + PIN
CREATE OR REPLACE FUNCTION member_login(p_dni TEXT, p_pin TEXT)
RETURNS JSON AS $$
DECLARE
  v_member members%ROWTYPE;
  v_membership memberships%ROWTYPE;
  v_plan membership_plans%ROWTYPE;
BEGIN
  -- Normalizar DNI (solo dígitos)
  SELECT * INTO v_member
  FROM members
  WHERE regexp_replace(dni, '[^0-9]', '', 'g') = regexp_replace(p_dni, '[^0-9]', '', 'g')
    AND pin_hash = crypt(p_pin, pin_hash)
    AND estado != 'baja';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'DNI o PIN incorrectos');
  END IF;

  -- Obtener membresía activa
  SELECT m.* INTO v_membership
  FROM memberships m
  WHERE m.member_id = v_member.id
    AND m.estado = 'activo'
  ORDER BY m.fecha_vencimiento DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT * INTO v_plan FROM membership_plans WHERE id = v_membership.plan_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'member', row_to_json(v_member),
    'membership', CASE WHEN v_membership.id IS NOT NULL THEN row_to_json(v_membership) ELSE NULL END,
    'plan', CASE WHEN v_plan.id IS NOT NULL THEN row_to_json(v_plan) ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check-in de miembro
CREATE OR REPLACE FUNCTION check_in_member(p_member_id UUID, p_staff_id UUID DEFAULT NULL, p_metodo TEXT DEFAULT 'manual')
RETURNS JSON AS $$
DECLARE
  v_member members%ROWTYPE;
  v_membership memberships%ROWTYPE;
  v_attendance attendance%ROWTYPE;
BEGIN
  SELECT * INTO v_member FROM members WHERE id = p_member_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Miembro no encontrado');
  END IF;

  IF v_member.estado = 'baja' OR v_member.estado = 'suspendido' THEN
    RETURN json_build_object('success', false, 'error', 'Miembro suspendido o dado de baja');
  END IF;

  -- Validar membresía vigente
  SELECT * INTO v_membership
  FROM memberships
  WHERE member_id = p_member_id
    AND estado = 'activo'
    AND fecha_vencimiento >= CURRENT_DATE
  ORDER BY fecha_vencimiento DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Membresía vencida o inexistente', 'member', row_to_json(v_member));
  END IF;

  -- Registrar asistencia
  INSERT INTO attendance (member_id, staff_id, tipo, metodo)
  VALUES (p_member_id, p_staff_id, 'gimnasio', p_metodo)
  RETURNING * INTO v_attendance;

  -- Si es plan por clases, decrementar
  IF v_membership.clases_restantes IS NOT NULL THEN
    UPDATE memberships
    SET clases_restantes = clases_restantes - 1,
        updated_at = NOW()
    WHERE id = v_membership.id
      AND clases_restantes > 0;
  END IF;

  RETURN json_build_object(
    'success', true,
    'member', row_to_json(v_member),
    'membership', row_to_json(v_membership),
    'attendance', row_to_json(v_attendance)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reservar clase
CREATE OR REPLACE FUNCTION book_class(p_member_id UUID, p_class_id UUID)
RETURNS JSON AS $$
DECLARE
  v_class classes%ROWTYPE;
  v_booking class_bookings%ROWTYPE;
  v_existing class_bookings%ROWTYPE;
  v_espera_pos INTEGER;
BEGIN
  SELECT * INTO v_class FROM classes WHERE id = p_class_id AND activa = TRUE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Clase no encontrada');
  END IF;

  -- Verificar si ya tiene reserva
  SELECT * INTO v_existing
  FROM class_bookings
  WHERE class_id = p_class_id AND member_id = p_member_id AND estado != 'cancelada';

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Ya tenés una reserva para esta clase');
  END IF;

  -- Ver si hay cupo
  IF v_class.cupo_disponible > 0 THEN
    INSERT INTO class_bookings (class_id, member_id, estado)
    VALUES (p_class_id, p_member_id, 'confirmada')
    RETURNING * INTO v_booking;

    UPDATE classes SET cupo_disponible = cupo_disponible - 1, updated_at = NOW()
    WHERE id = p_class_id;

    RETURN json_build_object('success', true, 'estado', 'confirmada', 'booking', row_to_json(v_booking));
  ELSE
    -- Lista de espera
    SELECT COALESCE(MAX(posicion_espera), 0) + 1 INTO v_espera_pos
    FROM class_bookings
    WHERE class_id = p_class_id AND estado = 'lista_espera';

    INSERT INTO class_bookings (class_id, member_id, estado, posicion_espera)
    VALUES (p_class_id, p_member_id, 'lista_espera', v_espera_pos)
    RETURNING * INTO v_booking;

    RETURN json_build_object('success', true, 'estado', 'lista_espera', 'posicion', v_espera_pos, 'booking', row_to_json(v_booking));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancelar reserva
CREATE OR REPLACE FUNCTION cancel_booking(p_booking_id UUID, p_member_id UUID)
RETURNS JSON AS $$
DECLARE
  v_booking class_bookings%ROWTYPE;
  v_class classes%ROWTYPE;
  v_next_espera class_bookings%ROWTYPE;
BEGIN
  SELECT * INTO v_booking
  FROM class_bookings
  WHERE id = p_booking_id AND member_id = p_member_id AND estado = 'confirmada';

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Reserva no encontrada');
  END IF;

  SELECT * INTO v_class FROM classes WHERE id = v_booking.class_id;

  -- Cancelar reserva
  UPDATE class_bookings SET estado = 'cancelada', updated_at = NOW() WHERE id = p_booking_id;

  -- Liberar cupo
  UPDATE classes SET cupo_disponible = cupo_disponible + 1, updated_at = NOW()
  WHERE id = v_booking.class_id;

  -- Promover primer en lista de espera
  SELECT * INTO v_next_espera
  FROM class_bookings
  WHERE class_id = v_booking.class_id AND estado = 'lista_espera'
  ORDER BY posicion_espera ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE class_bookings
    SET estado = 'confirmada', posicion_espera = NULL, updated_at = NOW()
    WHERE id = v_next_espera.id;

    UPDATE classes SET cupo_disponible = cupo_disponible - 1, updated_at = NOW()
    WHERE id = v_booking.class_id;
  END IF;

  RETURN json_build_object('success', true, 'message', 'Reserva cancelada correctamente');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dashboard del miembro
CREATE OR REPLACE FUNCTION get_member_dashboard(p_member_id UUID)
RETURNS JSON AS $$
DECLARE
  v_member JSON;
  v_membership JSON;
  v_clases_proximas JSON;
  v_asistencias_mes INTEGER;
  v_ultima_medicion JSON;
BEGIN
  SELECT row_to_json(m) INTO v_member FROM members m WHERE id = p_member_id;

  SELECT row_to_json(ms) INTO v_membership
  FROM memberships ms
  WHERE member_id = p_member_id AND estado = 'activo'
  ORDER BY fecha_vencimiento DESC LIMIT 1;

  SELECT COUNT(*) INTO v_asistencias_mes
  FROM attendance
  WHERE member_id = p_member_id
    AND created_at >= date_trunc('month', NOW());

  SELECT row_to_json(m) INTO v_ultima_medicion
  FROM measurements m WHERE member_id = p_member_id ORDER BY fecha DESC LIMIT 1;

  RETURN json_build_object(
    'member', v_member,
    'membership', v_membership,
    'asistencias_mes', v_asistencias_mes,
    'ultima_medicion', v_ultima_medicion
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Estadísticas del dashboard admin
CREATE OR REPLACE FUNCTION get_gym_stats(p_desde DATE DEFAULT NULL, p_hasta DATE DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  v_desde DATE := COALESCE(p_desde, date_trunc('month', CURRENT_DATE)::DATE);
  v_hasta DATE := COALESCE(p_hasta, CURRENT_DATE);
  v_ingresos NUMERIC;
  v_miembros_activos INTEGER;
  v_miembros_vencidos INTEGER;
  v_nuevos_mes INTEGER;
  v_asistencias_hoy INTEGER;
BEGIN
  SELECT COALESCE(SUM(monto), 0) INTO v_ingresos
  FROM payments WHERE estado = 'pagado' AND created_at::DATE BETWEEN v_desde AND v_hasta;

  SELECT COUNT(*) INTO v_miembros_activos FROM members WHERE estado = 'activo';
  SELECT COUNT(*) INTO v_miembros_vencidos FROM members WHERE estado = 'vencido';

  SELECT COUNT(*) INTO v_nuevos_mes
  FROM members WHERE created_at::DATE >= date_trunc('month', CURRENT_DATE)::DATE;

  SELECT COUNT(*) INTO v_asistencias_hoy
  FROM attendance WHERE created_at::DATE = CURRENT_DATE;

  RETURN json_build_object(
    'ingresos', v_ingresos,
    'miembros_activos', v_miembros_activos,
    'miembros_vencidos', v_miembros_vencidos,
    'nuevos_mes', v_nuevos_mes,
    'asistencias_hoy', v_asistencias_hoy,
    'desde', v_desde,
    'hasta', v_hasta
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Agenda de clases (pública)
CREATE OR REPLACE FUNCTION get_schedule(p_fecha_desde DATE DEFAULT NULL, p_fecha_hasta DATE DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(c))
    FROM (
      SELECT cl.*,
        ct.nombre as tipo_nombre, ct.color as tipo_color,
        t.nombre as trainer_nombre, t.apellido as trainer_apellido
      FROM classes cl
      LEFT JOIN class_types ct ON cl.class_type_id = ct.id
      LEFT JOIN trainers t ON cl.trainer_id = t.id
      WHERE cl.activa = TRUE
        AND cl.fecha_hora::DATE BETWEEN
          COALESCE(p_fecha_desde, CURRENT_DATE) AND
          COALESCE(p_fecha_hasta, CURRENT_DATE + 7)
      ORDER BY cl.fecha_hora
    ) c
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Calcular IMC al registrar medición
CREATE OR REPLACE FUNCTION trigger_calc_imc()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.peso IS NOT NULL AND NEW.altura IS NOT NULL AND NEW.altura > 0 THEN
    NEW.imc := ROUND((NEW.peso / ((NEW.altura / 100) ^ 2))::NUMERIC, 2);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calc_imc_trigger
BEFORE INSERT OR UPDATE ON measurements
FOR EACH ROW EXECUTE FUNCTION trigger_calc_imc();

-- Actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION trigger_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER updated_at_members BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER updated_at_memberships BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER updated_at_payments BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER updated_at_classes BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER updated_at_equipment BEFORE UPDATE ON equipment FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();
CREATE TRIGGER updated_at_routines BEFORE UPDATE ON routines FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Número de socio automático
CREATE OR REPLACE FUNCTION trigger_numero_socio()
RETURNS TRIGGER AS $$
DECLARE
  v_prefix TEXT;
  v_count INTEGER;
BEGIN
  SELECT prefijo_socio INTO v_prefix FROM gym_config LIMIT 1;
  v_prefix := COALESCE(v_prefix, 'KRV');
  SELECT COUNT(*) INTO v_count FROM members;
  NEW.numero_socio := v_prefix || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER numero_socio_trigger
BEFORE INSERT ON members
FOR EACH ROW EXECUTE FUNCTION trigger_numero_socio();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE gym_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para autenticados (simplificado para desarrollo)
CREATE POLICY "Allow authenticated" ON gym_config FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON staff_users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON members FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON membership_plans FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON memberships FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON payments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON cash_sessions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON expenses FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON trainers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON classes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON class_bookings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON attendance FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON exercises FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON routines FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON routine_days FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON routine_exercises FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON member_routines FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON measurements FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON equipment FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON supplies FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON notifications FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated" ON notification_templates FOR ALL TO authenticated USING (true);

-- Permitir acceso anónimo para RPCs públicas
CREATE POLICY "Allow anon read plans" ON membership_plans FOR SELECT TO anon USING (activo = true);
CREATE POLICY "Allow anon read classes" ON classes FOR SELECT TO anon USING (activa = true);
CREATE POLICY "Allow anon read class_types" ON class_types FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read trainers" ON trainers FOR SELECT TO anon USING (activo = true);

-- ============================================================
-- EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

-- Configuración del gimnasio
INSERT INTO gym_config (nombre, direccion, telefono, email, horario_apertura, horario_cierre, prefijo_socio)
VALUES ('Krovex Gym', 'Av. Corrientes 1234, Buenos Aires', '011-4567-8900', 'info@krovexgym.com.ar', '06:00', '23:00', 'KRV');

-- Planes de membresía
INSERT INTO membership_plans (nombre, descripcion, duracion_dias, precio, areas) VALUES
('Mensual Musculación', 'Acceso mensual a sala de musculación', 30, 15000.00, ARRAY['musculacion']),
('Trimestral Full', 'Acceso completo por 3 meses a todas las áreas', 90, 38000.00, ARRAY['musculacion', 'pilates', 'spinning', 'crossfit', 'yoga']),
('Plan Clases (x10)', 'Pack de 10 clases a elección', NULL, 25000.00, ARRAY['pilates', 'spinning', 'crossfit', 'yoga']);

UPDATE membership_plans SET cantidad_clases = 10 WHERE nombre = 'Plan Clases (x10)';

-- Tipos de clase
INSERT INTO class_types (nombre, tipo, descripcion, color) VALUES
('Spinning', 'spinning', 'Ciclismo indoor de alta intensidad', '#f59e0b'),
('Yoga', 'yoga', 'Práctica de yoga para todos los niveles', '#10b981'),
('Pilates', 'pilates', 'Fortalecimiento y flexibilidad', '#8b5cf6'),
('Crossfit', 'crossfit', 'Entrenamiento funcional de alta intensidad', '#ef4444'),
('Musculación Libre', 'musculacion', 'Sala de musculación libre acceso', '#2563EB');

-- Entrenadores (sin staff_id ya que no tenemos auth users de prueba)
INSERT INTO trainers (nombre, apellido, email, telefono, especialidades, activo, comision_por_clase) VALUES
('Lucas', 'Fernández', 'lucas@krovexgym.com.ar', '011-1111-2222', ARRAY['musculacion', 'funcional'], TRUE, 1500.00),
('Sofía', 'Romero', 'sofia@krovexgym.com.ar', '011-3333-4444', ARRAY['yoga', 'pilates'], TRUE, 1500.00),
('Diego', 'Torres', 'diego@krovexgym.com.ar', '011-5555-6666', ARRAY['spinning', 'crossfit'], TRUE, 1500.00);

-- Miembros de ejemplo (PIN: 1234 → crypt('1234', gen_salt('bf')))
-- Nota: Los PINs se insertan con crypt() de pgcrypto
INSERT INTO members (nombre, apellido, dni, pin_hash, email, telefono, estado) VALUES
('Juan', 'Pérez', '30111222', crypt('1234', gen_salt('bf')), 'juan@email.com', '011-1234-5678', 'activo'),
('María', 'García', '27333444', crypt('1234', gen_salt('bf')), 'maria@email.com', '011-2345-6789', 'activo'),
('Carlos', 'López', '33555666', crypt('1234', gen_salt('bf')), 'carlos@email.com', '011-3456-7890', 'vencido'),
('Ana', 'Martínez', '29777888', crypt('1234', gen_salt('bf')), 'ana@email.com', '011-4567-8901', 'activo'),
('Pedro', 'Rodríguez', '35999000', crypt('1234', gen_salt('bf')), 'pedro@email.com', '011-5678-9012', 'suspendido');

-- Membresías
DO $$
DECLARE
  v_member_id UUID;
  v_plan_id UUID;
BEGIN
  -- Juan Pérez - Mensual musculación
  SELECT id INTO v_member_id FROM members WHERE dni = '30111222';
  SELECT id INTO v_plan_id FROM membership_plans WHERE nombre = 'Mensual Musculación';
  INSERT INTO memberships (member_id, plan_id, fecha_inicio, fecha_vencimiento, estado)
  VALUES (v_member_id, v_plan_id, CURRENT_DATE - 10, CURRENT_DATE + 20, 'activo');

  -- María García - Trimestral
  SELECT id INTO v_member_id FROM members WHERE dni = '27333444';
  SELECT id INTO v_plan_id FROM membership_plans WHERE nombre = 'Trimestral Full';
  INSERT INTO memberships (member_id, plan_id, fecha_inicio, fecha_vencimiento, estado)
  VALUES (v_member_id, v_plan_id, CURRENT_DATE - 30, CURRENT_DATE + 60, 'activo');

  -- Carlos López - vencida
  SELECT id INTO v_member_id FROM members WHERE dni = '33555666';
  SELECT id INTO v_plan_id FROM membership_plans WHERE nombre = 'Mensual Musculación';
  INSERT INTO memberships (member_id, plan_id, fecha_inicio, fecha_vencimiento, estado)
  VALUES (v_member_id, v_plan_id, CURRENT_DATE - 60, CURRENT_DATE - 30, 'vencido');

  -- Ana Martínez - Plan clases
  SELECT id INTO v_member_id FROM members WHERE dni = '29777888';
  SELECT id INTO v_plan_id FROM membership_plans WHERE nombre = 'Plan Clases (x10)';
  INSERT INTO memberships (member_id, plan_id, fecha_inicio, fecha_vencimiento, clases_restantes, estado)
  VALUES (v_member_id, v_plan_id, CURRENT_DATE - 15, CURRENT_DATE + 75, 7, 'activo');
END $$;

-- Pagos de ejemplo
INSERT INTO payments (member_id, monto, metodo, estado, concepto, created_at)
SELECT m.id, 15000.00, 'efectivo', 'pagado', 'Mensual Musculación', NOW() - INTERVAL '10 days'
FROM members m WHERE m.dni = '30111222';

INSERT INTO payments (member_id, monto, metodo, estado, concepto, created_at)
SELECT m.id, 38000.00, 'transferencia', 'pagado', 'Trimestral Full', NOW() - INTERVAL '30 days'
FROM members m WHERE m.dni = '27333444';

INSERT INTO payments (member_id, monto, metodo, estado, concepto, created_at)
SELECT m.id, 25000.00, 'mercadopago', 'pagado', 'Plan Clases x10', NOW() - INTERVAL '15 days'
FROM members m WHERE m.dni = '29777888';

-- Pagos adicionales para el mes
INSERT INTO payments (member_id, monto, metodo, estado, concepto, created_at)
SELECT m.id, 15000.00, 'efectivo', 'pagado', 'Mensual Musculación', NOW() - INTERVAL '5 days'
FROM members m WHERE m.dni = '30111222';

-- Clases de ejemplo
DO $$
DECLARE
  v_spinning_type UUID;
  v_yoga_type UUID;
  v_pilates_type UUID;
  v_crossfit_type UUID;
  v_lucas UUID;
  v_sofia UUID;
  v_diego UUID;
  v_monday DATE;
BEGIN
  SELECT id INTO v_spinning_type FROM class_types WHERE tipo = 'spinning';
  SELECT id INTO v_yoga_type FROM class_types WHERE tipo = 'yoga';
  SELECT id INTO v_pilates_type FROM class_types WHERE tipo = 'pilates';
  SELECT id INTO v_crossfit_type FROM class_types WHERE tipo = 'crossfit';
  SELECT id INTO v_lucas FROM trainers WHERE nombre = 'Lucas';
  SELECT id INTO v_sofia FROM trainers WHERE nombre = 'Sofía';
  SELECT id INTO v_diego FROM trainers WHERE nombre = 'Diego';

  -- Lunes de esta semana
  v_monday := date_trunc('week', CURRENT_DATE)::DATE + 1;

  -- Spinning Lunes, Miércoles, Viernes 7:00hs
  INSERT INTO classes (class_type_id, trainer_id, nombre, fecha_hora, duracion_minutos, cupo_maximo, cupo_disponible)
  VALUES
    (v_spinning_type, v_diego, 'Spinning Mañana', v_monday + TIME '07:00', 60, 15, 12),
    (v_spinning_type, v_diego, 'Spinning Mañana', v_monday + 2 + TIME '07:00', 60, 15, 13),
    (v_spinning_type, v_diego, 'Spinning Mañana', v_monday + 4 + TIME '07:00', 60, 15, 15);

  -- Yoga Martes y Jueves 9:00hs
  INSERT INTO classes (class_type_id, trainer_id, nombre, fecha_hora, duracion_minutos, cupo_maximo, cupo_disponible)
  VALUES
    (v_yoga_type, v_sofia, 'Yoga Mañana', v_monday + 1 + TIME '09:00', 60, 12, 8),
    (v_yoga_type, v_sofia, 'Yoga Mañana', v_monday + 3 + TIME '09:00', 60, 12, 10);

  -- Pilates Lunes y Miércoles 18:00hs
  INSERT INTO classes (class_type_id, trainer_id, nombre, fecha_hora, duracion_minutos, cupo_maximo, cupo_disponible)
  VALUES
    (v_pilates_type, v_sofia, 'Pilates Tarde', v_monday + TIME '18:00', 60, 10, 7),
    (v_pilates_type, v_sofia, 'Pilates Tarde', v_monday + 2 + TIME '18:00', 60, 10, 9);

  -- Crossfit Lunes a Viernes 19:00hs
  INSERT INTO classes (class_type_id, trainer_id, nombre, fecha_hora, duracion_minutos, cupo_maximo, cupo_disponible)
  VALUES
    (v_crossfit_type, v_diego, 'Crossfit Noche', v_monday + TIME '19:00', 60, 20, 15),
    (v_crossfit_type, v_diego, 'Crossfit Noche', v_monday + 1 + TIME '19:00', 60, 20, 18),
    (v_crossfit_type, v_diego, 'Crossfit Noche', v_monday + 2 + TIME '19:00', 60, 20, 16),
    (v_crossfit_type, v_diego, 'Crossfit Noche', v_monday + 3 + TIME '19:00', 60, 20, 20),
    (v_crossfit_type, v_diego, 'Crossfit Noche', v_monday + 4 + TIME '19:00', 60, 20, 17);
END $$;

-- Ejercicios base
INSERT INTO exercises (nombre, grupo_muscular, descripcion) VALUES
('Press de banca', 'pecho', 'Ejercicio fundamental para pecho con barra'),
('Aperturas con mancuernas', 'pecho', 'Apertura en banco plano para pecho'),
('Fondos en paralelas', 'pecho', 'Ejercicio de peso corporal para pecho y tríceps'),
('Dominadas', 'espalda', 'Tirón vertical con peso corporal'),
('Remo con barra', 'espalda', 'Tirón horizontal con barra'),
('Jalón al pecho', 'espalda', 'Tirón vertical en polea alta'),
('Press militar', 'hombros', 'Press de hombros con barra o mancuernas'),
('Elevaciones laterales', 'hombros', 'Aislamiento del deltoides lateral'),
('Curl de bíceps', 'brazos', 'Curl con barra o mancuernas'),
('Press francés', 'brazos', 'Extensión de tríceps en banco'),
('Sentadilla', 'piernas', 'El rey de los ejercicios de piernas'),
('Peso muerto', 'piernas', 'Ejercicio compuesto cadena posterior'),
('Prensa de piernas', 'piernas', 'Sentadilla en máquina'),
('Extensión de cuádriceps', 'piernas', 'Aislamiento de cuádriceps en máquina'),
('Plancha', 'core', 'Isometría de core'),
('Abdominales', 'core', 'Crunch abdominal básico'),
('Rueda abdominal', 'core', 'Rollout con rueda abdominal'),
('Hip thrust', 'gluteos', 'Empuje de cadera con barra'),
('Patada trasera en polea', 'gluteos', 'Aislamiento de glúteo en polea'),
('Peso muerto rumano', 'gluteos', 'Bisagra de cadera con mancuernas o barra');

-- Asistencias de ejemplo (últimos 30 días)
DO $$
DECLARE
  v_juan UUID;
  v_maria UUID;
  v_ana UUID;
  i INTEGER;
BEGIN
  SELECT id INTO v_juan FROM members WHERE dni = '30111222';
  SELECT id INTO v_maria FROM members WHERE dni = '27333444';
  SELECT id INTO v_ana FROM members WHERE dni = '29777888';

  FOR i IN 1..20 LOOP
    IF i % 2 = 0 THEN
      INSERT INTO attendance (member_id, tipo, metodo, created_at)
      VALUES (v_juan, 'gimnasio', 'manual', NOW() - (i || ' days')::INTERVAL);
    END IF;
    IF i % 3 = 0 THEN
      INSERT INTO attendance (member_id, tipo, metodo, created_at)
      VALUES (v_maria, 'gimnasio', 'qr', NOW() - (i || ' days')::INTERVAL);
    END IF;
    IF i % 4 = 0 THEN
      INSERT INTO attendance (member_id, tipo, metodo, created_at)
      VALUES (v_ana, 'gimnasio', 'manual', NOW() - (i || ' days')::INTERVAL);
    END IF;
  END LOOP;
END $$;

-- Mediciones de ejemplo
DO $$
DECLARE
  v_juan UUID;
  v_maria UUID;
BEGIN
  SELECT id INTO v_juan FROM members WHERE dni = '30111222';
  SELECT id INTO v_maria FROM members WHERE dni = '27333444';

  INSERT INTO measurements (member_id, fecha, peso, altura, porcentaje_grasa, porcentaje_musculo, cintura, cadera, pecho)
  VALUES
    (v_juan, CURRENT_DATE - 60, 85.5, 178.0, 22.0, 38.0, 90.0, 95.0, 100.0),
    (v_juan, CURRENT_DATE - 30, 83.0, 178.0, 20.5, 39.5, 88.0, 94.0, 101.0),
    (v_juan, CURRENT_DATE, 81.2, 178.0, 19.0, 41.0, 86.0, 93.0, 102.0),
    (v_maria, CURRENT_DATE - 60, 62.0, 165.0, 28.0, 32.0, 72.0, 88.0, 86.0),
    (v_maria, CURRENT_DATE - 30, 60.5, 165.0, 26.5, 33.5, 70.0, 87.0, 85.5),
    (v_maria, CURRENT_DATE, 59.0, 165.0, 25.0, 35.0, 68.0, 86.0, 85.0);
END $$;

-- Rutina de ejemplo
DO $$
DECLARE
  v_routine_id UUID;
  v_day1_id UUID;
  v_day2_id UUID;
  v_day3_id UUID;
  v_press_id UUID;
  v_aperturas_id UUID;
  v_dominadas_id UUID;
  v_remo_id UUID;
  v_sentadilla_id UUID;
  v_peso_muerto_id UUID;
  v_plancha_id UUID;
  v_curl_id UUID;
  v_juan_id UUID;
BEGIN
  SELECT id INTO v_juan_id FROM members WHERE dni = '30111222';
  SELECT id INTO v_press_id FROM exercises WHERE nombre = 'Press de banca';
  SELECT id INTO v_aperturas_id FROM exercises WHERE nombre = 'Aperturas con mancuernas';
  SELECT id INTO v_dominadas_id FROM exercises WHERE nombre = 'Dominadas';
  SELECT id INTO v_remo_id FROM exercises WHERE nombre = 'Remo con barra';
  SELECT id INTO v_sentadilla_id FROM exercises WHERE nombre = 'Sentadilla';
  SELECT id INTO v_peso_muerto_id FROM exercises WHERE nombre = 'Peso muerto';
  SELECT id INTO v_plancha_id FROM exercises WHERE nombre = 'Plancha';
  SELECT id INTO v_curl_id FROM exercises WHERE nombre = 'Curl de bíceps';

  INSERT INTO routines (nombre, descripcion, objetivo, nivel, duracion_semanas)
  VALUES ('Rutina Fullbody 3x por semana', 'Rutina de iniciación 3 días', 'Ganancia de fuerza y masa muscular', 'principiante', 8)
  RETURNING id INTO v_routine_id;

  INSERT INTO routine_days (routine_id, dia_numero, nombre, orden) VALUES
  (v_routine_id, 1, 'Día A - Pecho y Espalda', 1) RETURNING id INTO v_day1_id;
  INSERT INTO routine_days (routine_id, dia_numero, nombre, orden) VALUES
  (v_routine_id, 3, 'Día B - Piernas', 2) RETURNING id INTO v_day2_id;
  INSERT INTO routine_days (routine_id, dia_numero, nombre, orden) VALUES
  (v_routine_id, 5, 'Día C - Brazos y Core', 3) RETURNING id INTO v_day3_id;

  -- Día A
  INSERT INTO routine_exercises (routine_day_id, exercise_id, series, repeticiones, peso, descanso_segundos, orden) VALUES
  (v_day1_id, v_press_id, 4, '8-10', '60kg', 90, 1),
  (v_day1_id, v_aperturas_id, 3, '12-15', '16kg', 60, 2),
  (v_day1_id, v_dominadas_id, 4, '6-8', 'Peso corporal', 90, 3),
  (v_day1_id, v_remo_id, 3, '10-12', '50kg', 75, 4);

  -- Día B
  INSERT INTO routine_exercises (routine_day_id, exercise_id, series, repeticiones, peso, descanso_segundos, orden) VALUES
  (v_day2_id, v_sentadilla_id, 4, '10-12', '80kg', 120, 1),
  (v_day2_id, v_peso_muerto_id, 3, '8-10', '90kg', 120, 2),
  (v_day2_id, v_plancha_id, 3, '45seg', NULL, 45, 3);

  -- Día C
  INSERT INTO routine_exercises (routine_day_id, exercise_id, series, repeticiones, peso, descanso_segundos, orden) VALUES
  (v_day3_id, v_curl_id, 4, '10-12', '14kg', 60, 1),
  (v_day3_id, v_plancha_id, 3, '60seg', NULL, 45, 2);

  -- Asignar rutina a Juan
  INSERT INTO member_routines (member_id, routine_id, fecha_inicio, activa)
  VALUES (v_juan_id, v_routine_id, CURRENT_DATE - 14, TRUE);
END $$;

-- Equipamiento de ejemplo
INSERT INTO equipment (nombre, marca, area, estado, fecha_compra, ultima_revision) VALUES
('Barra Olímpica 20kg', 'York', 'musculacion', 'operativo', '2022-01-15', CURRENT_DATE - 30),
('Rack de sentadillas', 'Force USA', 'musculacion', 'operativo', '2022-01-15', CURRENT_DATE - 30),
('Bicicleta de spinning #1', 'Keiser', 'spinning', 'operativo', '2021-06-20', CURRENT_DATE - 15),
('Bicicleta de spinning #2', 'Keiser', 'spinning', 'mantenimiento', '2021-06-20', CURRENT_DATE - 60),
('Mat de yoga', 'Liforme', 'yoga', 'operativo', '2022-03-10', CURRENT_DATE - 10),
('Cinta de correr', 'Technogym', 'cardio', 'operativo', '2020-08-05', CURRENT_DATE - 45),
('Mancuernas 5-30kg', 'American Barbell', 'musculacion', 'operativo', '2021-01-01', CURRENT_DATE - 20);

-- Insumos de ejemplo
INSERT INTO supplies (nombre, categoria, stock_actual, stock_minimo, unidad, precio_unitario) VALUES
('Toallas deportivas', 'limpieza', 45, 20, 'unidad', 800.00),
('Detergente multiusos', 'limpieza', 8, 5, 'litro', 1500.00),
('Bolsas de residuos', 'limpieza', 200, 50, 'unidad', 50.00),
('Guantes de entrenamiento', 'accesorios', 12, 10, 'par', 3500.00),
('Tizas de manos', 'accesorios', 30, 10, 'unidad', 200.00);

-- Plantillas de notificación
INSERT INTO notification_templates (nombre, tipo, titulo, mensaje) VALUES
('Bienvenida', 'bienvenida', '¡Bienvenido/a a Krovex Gym! 💪', 'Hola {nombre}, nos alegra tenerte en nuestra familia. Tu membresía está activa. ¡A entrenar!'),
('Renovación próxima', 'alerta', 'Tu membresía vence pronto', 'Hola {nombre}, tu membresía vence el {fecha_vencimiento}. Renová antes de que expire para no perder tu lugar.'),
('Pago pendiente', 'deuda', 'Tenés un pago pendiente', 'Hola {nombre}, registramos una cuota pendiente de ${monto}. Acercate a recepción para regularizar tu situación.'),
('Feliz cumpleaños', 'info', '¡Feliz cumpleaños! 🎂', 'Hola {nombre}, el equipo de Krovex Gym te desea un feliz cumpleaños. ¡Que cumplas muchos más!');

-- Notificaciones de ejemplo
INSERT INTO notifications (member_id, titulo, mensaje, tipo)
SELECT id, '¡Bienvenido/a a Krovex Gym! 💪', 'Hola Juan, nos alegra tenerte en nuestra familia. Tu membresía está activa. ¡A entrenar!', 'bienvenida'
FROM members WHERE dni = '30111222';

INSERT INTO notifications (member_id, titulo, mensaje, tipo)
SELECT id, 'Tu membresía vence pronto', 'Tu membresía vence en 20 días. Renová antes para no perder tu lugar.', 'alerta'
FROM members WHERE dni = '30111222';
