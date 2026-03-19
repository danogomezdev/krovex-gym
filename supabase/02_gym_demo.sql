-- ============================================================
-- KROVEX GYM — Datos demo completos
-- Supabase: pwwpothyqyembxrgvaia
-- ============================================================
-- PASO PREVIO: Crear usuario demo@krovex.dev en Auth con pass krovex2025
-- Luego ejecutar todo esto en SQL Editor

-- ── CLUB ──────────────────────────────────────────────────
INSERT INTO public.clubs (id, nombre, slug, direccion, telefono, email, activo)
VALUES ('gym00000-0000-0000-0000-000000000000', 'Fitness Evolution', 'demo', 'Av. Belgrano 850, Venado Tuerto', '+5493462375305', 'info@fitnessevolution.com.ar', true)
ON CONFLICT (slug) DO UPDATE SET nombre = 'Fitness Evolution', direccion = 'Av. Belgrano 850, Venado Tuerto';

-- Admin
INSERT INTO public.staff_users (id, club_id, rol, nombre, email, activo)
SELECT u.id, 'gym00000-0000-0000-0000-000000000000', 'admin', 'Demo Admin', u.email, true
FROM auth.users u WHERE u.email = 'demo@krovex.dev'
ON CONFLICT (id) DO NOTHING;

-- ── MEMBRESÍAS ────────────────────────────────────────────
INSERT INTO public.membresias (id, club_id, nombre, precio, duracion_dias, activa, descripcion) VALUES
  ('mem11111-1111-1111-1111-111111111111', 'gym00000-0000-0000-0000-000000000000', 'Mensual Básico',   8500,  30, true, 'Acceso libre L-V · Musculación y cardio'),
  ('mem22222-2222-2222-2222-222222222222', 'gym00000-0000-0000-0000-000000000000', 'Mensual Completo', 12000, 30, true, 'Acceso ilimitado · Clases grupales incluidas'),
  ('mem33333-3333-3333-3333-333333333333', 'gym00000-0000-0000-0000-000000000000', 'Trimestral',       30000, 90, true, '3 meses · Ahorrás 15% vs mensual'),
  ('mem44444-4444-4444-4444-444444444444', 'gym00000-0000-0000-0000-000000000000', 'Anual',           95000, 365, true, '12 meses · El mejor precio por día'),
  ('mem55555-5555-5555-5555-555555555555', 'gym00000-0000-0000-0000-000000000000', 'Clases Solo',      6000,  30, true, 'Solo clases grupales · Sin musculación')
ON CONFLICT (id) DO NOTHING;

-- ── SOCIOS ────────────────────────────────────────────────
INSERT INTO public.socios (id, club_id, nombre, apellido, email, telefono, dni, fecha_nacimiento, activo, foto_url) VALUES
  ('soc11111-1111-1111-1111-111111111111', 'gym00000-0000-0000-0000-000000000000', 'Lucas',     'Giménez',   'lucas@demo.com',   '+5493462100001', '35100001', '1990-04-15', true,  null),
  ('soc22222-2222-2222-2222-222222222222', 'gym00000-0000-0000-0000-000000000000', 'Valentina', 'Morales',   'vale@demo.com',    '+5493462100002', '38200002', '1994-07-22', true,  null),
  ('soc33333-3333-3333-3333-333333333333', 'gym00000-0000-0000-0000-000000000000', 'Matías',    'Fernández', 'matias@demo.com',  '+5493462100003', '37300003', '1992-11-08', true,  null),
  ('soc44444-4444-4444-4444-444444444444', 'gym00000-0000-0000-0000-000000000000', 'Sofía',     'López',     'sofia@demo.com',   '+5493462100004', '40400004', '1998-03-30', true,  null),
  ('soc55555-5555-5555-5555-555555555555', 'gym00000-0000-0000-0000-000000000000', 'Agustín',   'Sosa',      'agus@demo.com',    '+5493462100005', '36500005', '1991-09-12', true,  null),
  ('soc66666-6666-6666-6666-666666666666', 'gym00000-0000-0000-0000-000000000000', 'Camila',    'Torres',    'cami@demo.com',    '+5493462100006', '41600006', '1999-06-18', true,  null),
  ('soc77777-7777-7777-7777-777777777777', 'gym00000-0000-0000-0000-000000000000', 'Franco',    'Núñez',     'franco@demo.com',  '+5493462100007', '39700007', '1996-01-25', true,  null),
  ('soc88888-8888-8888-8888-888888888888', 'gym00000-0000-0000-0000-000000000000', 'Lucía',     'Martínez',  'lucia@demo.com',   '+5493462100008', '42800008', '2000-08-14', true,  null),
  ('soc99999-9999-9999-9999-999999999999', 'gym00000-0000-0000-0000-000000000000', 'Nicolás',   'Herrera',   'nico@demo.com',    '+5493462100009', '34900009', '1988-12-03', false, null),
  ('socaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gym00000-0000-0000-0000-000000000000', 'Florencia', 'Díaz',      'flor@demo.com',    '+5493462100010', '43000010', '2001-05-19', true,  null),
  ('socbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gym00000-0000-0000-0000-000000000000', 'Ramiro',    'Álvarez',   'ramiro@demo.com',  '+5493462100011', '37100011', '1993-02-07', true,  null),
  ('socccccc-cccc-cccc-cccc-cccccccccccc', 'gym00000-0000-0000-0000-000000000000', 'Milagros',  'Castillo',  'mili@demo.com',    '+5493462100012', '40200012', '1997-10-29', true,  null)
ON CONFLICT (id) DO NOTHING;

-- ── INSCRIPCIONES A MEMBRESÍA ─────────────────────────────
INSERT INTO public.inscripciones (id, socio_id, membresia_id, fecha_inicio, fecha_fin, precio_pagado, estado, metodo_pago) VALUES
  ('ins11111-1111-1111-1111-111111111111', 'soc11111-1111-1111-1111-111111111111', 'mem22222-2222-2222-2222-222222222222', CURRENT_DATE - 10, CURRENT_DATE + 20, 12000, 'activa',   'mercadopago'),
  ('ins22222-2222-2222-2222-222222222222', 'soc22222-2222-2222-2222-222222222222', 'mem33333-3333-3333-3333-333333333333', CURRENT_DATE - 5,  CURRENT_DATE + 85, 30000, 'activa',   'transferencia'),
  ('ins33333-3333-3333-3333-333333333333', 'soc33333-3333-3333-3333-333333333333', 'mem11111-1111-1111-1111-111111111111', CURRENT_DATE - 20, CURRENT_DATE + 10, 8500,  'activa',   'efectivo'),
  ('ins44444-4444-4444-4444-444444444444', 'soc44444-4444-4444-4444-444444444444', 'mem44444-4444-4444-4444-444444444444', CURRENT_DATE - 60, CURRENT_DATE + 305,95000,'activa',   'mercadopago'),
  ('ins55555-5555-5555-5555-555555555555', 'soc55555-5555-5555-5555-555555555555', 'mem22222-2222-2222-2222-222222222222', CURRENT_DATE - 2,  CURRENT_DATE + 28, 12000, 'activa',   'transferencia'),
  ('ins66666-6666-6666-6666-666666666666', 'soc66666-6666-6666-6666-666666666666', 'mem55555-5555-5555-5555-555555555555', CURRENT_DATE - 15, CURRENT_DATE + 15, 6000,  'activa',   'efectivo'),
  ('ins77777-7777-7777-7777-777777777777', 'soc77777-7777-7777-7777-777777777777', 'mem11111-1111-1111-1111-111111111111', CURRENT_DATE - 35, CURRENT_DATE - 5,  8500,  'vencida',  'mercadopago'),
  ('ins88888-8888-8888-8888-888888888888', 'soc88888-8888-8888-8888-888888888888', 'mem22222-2222-2222-2222-222222222222', CURRENT_DATE - 1,  CURRENT_DATE + 29, 12000, 'activa',   'mercadopago'),
  ('insaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'socaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'mem33333-3333-3333-3333-333333333333', CURRENT_DATE - 8,  CURRENT_DATE + 82, 30000, 'activa',   'transferencia'),
  ('insbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'socbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'mem22222-2222-2222-2222-222222222222', CURRENT_DATE - 12, CURRENT_DATE + 18, 12000, 'activa',   'efectivo'),
  ('insc cccc-cccc-cccc-cccc-cccccccccccc','socccccc-cccc-cccc-cccc-cccccccccccc', 'mem11111-1111-1111-1111-111111111111', CURRENT_DATE - 45, CURRENT_DATE - 15, 8500,  'vencida',  'mercadopago')
ON CONFLICT (id) DO NOTHING;

-- ── CHECK-INS (últimos días) ───────────────────────────────
INSERT INTO public.checkins (socio_id, club_id, fecha_hora) VALUES
  ('soc11111-1111-1111-1111-111111111111', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '2 hours'),
  ('soc22222-2222-2222-2222-222222222222', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '3 hours'),
  ('soc33333-3333-3333-3333-333333333333', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '4 hours'),
  ('soc44444-4444-4444-4444-444444444444', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '1 hour'),
  ('soc55555-5555-5555-5555-555555555555', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '5 hours'),
  ('soc88888-8888-8888-8888-888888888888', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '30 minutes'),
  ('socaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '6 hours'),
  -- Ayer
  ('soc11111-1111-1111-1111-111111111111', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '26 hours'),
  ('soc33333-3333-3333-3333-333333333333', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '27 hours'),
  ('soc66666-6666-6666-6666-666666666666', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '28 hours'),
  ('socbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '29 hours'),
  -- Antes de ayer
  ('soc22222-2222-2222-2222-222222222222', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '50 hours'),
  ('soc44444-4444-4444-4444-444444444444', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '51 hours'),
  ('soc77777-7777-7777-7777-777777777777', 'gym00000-0000-0000-0000-000000000000', NOW() - INTERVAL '52 hours');

-- ── CLASES GRUPALES ───────────────────────────────────────
INSERT INTO public.clases (id, club_id, nombre, instructor, dia_semana, hora_inicio, hora_fin, cupo_maximo, activa) VALUES
  ('cla11111-1111-1111-1111-111111111111', 'gym00000-0000-0000-0000-000000000000', 'Spinning',       'María González',  1, '07:00', '08:00', 15, true),
  ('cla22222-2222-2222-2222-222222222222', 'gym00000-0000-0000-0000-000000000000', 'Pilates',        'Laura Sánchez',   1, '09:00', '10:00', 12, true),
  ('cla33333-3333-3333-3333-333333333333', 'gym00000-0000-0000-0000-000000000000', 'CrossFit',       'Diego Ruiz',      2, '18:00', '19:00', 10, true),
  ('cla44444-4444-4444-4444-444444444444', 'gym00000-0000-0000-0000-000000000000', 'Zumba',          'Ana Peralta',     3, '19:00', '20:00', 20, true),
  ('cla55555-5555-5555-5555-555555555555', 'gym00000-0000-0000-0000-000000000000', 'Yoga',           'Patricia Vega',   4, '08:00', '09:00', 10, true),
  ('cla66666-6666-6666-6666-666666666666', 'gym00000-0000-0000-0000-000000000000', 'Box Fitness',    'Carlos Medina',   5, '20:00', '21:00', 15, true),
  ('cla77777-7777-7777-7777-777777777777', 'gym00000-0000-0000-0000-000000000000', 'Full Body',      'Diego Ruiz',      6, '09:00', '10:00', 12, true)
ON CONFLICT (id) DO NOTHING;
