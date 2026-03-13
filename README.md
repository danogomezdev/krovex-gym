# 🏋️ Krovex Gym System

Sistema de gestión integral para gimnasios. Stack: **React 18 + Vite + Supabase**.

---

## 🚀 Setup rápido

### 1. Clonar e instalar
```bash
git clone <tu-repo>
cd krovex-gym
npm install
```

### 2. Variables de entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

### 3. Configurar Supabase
1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ir a **SQL Editor** y ejecutar todo el contenido de `supabase_setup.sql`
3. Copiar URL y anon key en `.env`

### 4. Correr en desarrollo
```bash
npm run dev
```

---

## 👤 Credenciales de prueba

### Admin (Supabase Auth)
Crear usuario en Supabase Authentication > Users con cualquier email/password.

### Demo rápido
El sistema detecta automáticamente si no hay sesión activa y redirige al login.

### Miembros (DNI + PIN)
| Nombre | DNI | PIN |
|--------|-----|-----|
| Juan Pérez | 30111222 | 1234 |
| María García | 27333444 | 1234 |
| Carlos López | 33555666 | 1234 |
| Ana Martínez | 29777888 | 1234 |
| Pedro Rodríguez | 35999000 | 1234 |

---

## 🗂️ Estructura del proyecto

```
krovex-gym/
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── AdminLayout.jsx/.css     # Sidebar colapsable admin
│   │       ├── TrainerLayout.jsx/.css   # Panel entrenador
│   │       └── MemberLayout.jsx/.css    # Mobile-first miembro
│   ├── context/
│   │   └── AuthContext.jsx              # Auth dual (staff + miembro)
│   ├── lib/
│   │   └── supabase.js                  # Cliente Supabase
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── DashboardPage.jsx        # KPIs + gráficos
│   │   │   ├── MembersPage.jsx          # Lista miembros
│   │   │   ├── MemberDetailPage.jsx     # Detalle + QR + tabs
│   │   │   ├── NewMemberPage.jsx        # Alta/edición miembro
│   │   │   ├── PlansPage.jsx            # Planes de membresía
│   │   │   ├── PaymentsPage.jsx         # Gestión de pagos
│   │   │   ├── CashRegisterPage.jsx     # Caja diaria
│   │   │   ├── ClassesPage.jsx          # CRUD clases
│   │   │   ├── SchedulePage.jsx         # Vista semanal
│   │   │   ├── TrainersPage.jsx         # Gestión entrenadores
│   │   │   ├── RoutinesPage.jsx         # Constructor rutinas
│   │   │   ├── ExercisesPage.jsx        # Base de ejercicios
│   │   │   ├── MeasurementsPage.jsx     # Medidas corporales
│   │   │   ├── CheckInPage.jsx          # Check-in manual/QR
│   │   │   ├── InventoryPage.jsx        # Equipos e insumos
│   │   │   ├── CommunicationsPage.jsx   # Avisos a miembros
│   │   │   ├── ReportsPage.jsx          # Analytics + gráficos
│   │   │   └── SettingsPage.jsx         # Config del gimnasio
│   │   ├── trainer/
│   │   │   ├── TrainerDashboardPage.jsx # Próximas clases
│   │   │   └── TrainerClassPage.jsx     # Asistencia de clase
│   │   ├── member/
│   │   │   ├── MemberDashboardPage.jsx  # Home portal miembro
│   │   │   ├── MemberClassesPage.jsx    # Reserva de clases
│   │   │   ├── MemberRoutinePage.jsx    # Ver rutina asignada
│   │   │   ├── MemberProgressPage.jsx   # Evolución + heatmap
│   │   │   └── MemberProfilePage.jsx    # Perfil + QR personal
│   │   └── LoginPage.jsx               # Login staff + socio
│   ├── styles/
│   │   ├── variables.css               # Design tokens Krovex
│   │   └── global.css                  # Reset + componentes globales
│   ├── utils/
│   │   └── helpers.js                  # Formatters, validators, utils
│   ├── App.jsx                         # Routing principal
│   └── main.jsx                        # Entry point
├── supabase_setup.sql                  # Schema + seed data completo
├── .env.example
└── vite.config.js
```

---

## 🔐 Roles del sistema

| Rol | Acceso |
|-----|--------|
| `super_admin` | Todo el panel admin |
| `admin` | Panel admin completo |
| `recepcionista` | Check-in, pagos, miembros |
| `entrenador` | Portal trainer (sus clases) |
| `miembro` | Portal miembro (móvil) |

---

## 📊 Módulos admin

| Módulo | Descripción |
|--------|-------------|
| Dashboard | KPIs en tiempo real, gráficos, alertas |
| Miembros | CRUD completo, QR, tabs detalle |
| Pagos | Registro, filtros, exportar CSV |
| Caja diaria | Apertura/cierre, egresos, balance |
| Clases | CRUD clases, tipos con colores |
| Horarios | Vista semanal con navegación |
| Entrenadores | Perfiles, especialidades, comisiones |
| Rutinas | Constructor visual por días/ejercicios |
| Ejercicios | Base de datos por grupo muscular |
| Medidas | Registro y gráficos de evolución |
| Check-in | Búsqueda + QR, historial del día |
| Inventario | Equipos con mantenimiento, insumos stock |
| Comunicaciones | Avisos individuales o masivos, plantillas |
| Reportes | Analytics, horas pico, top miembros |
| Configuración | Datos del gimnasio, horarios, sistema |

---

## 🛠️ Tecnologías

- **Frontend**: React 18, Vite 5, React Router v6
- **Backend**: Supabase (PostgreSQL, Auth, RLS, RPCs)
- **UI**: CSS puro con variables, sin framework
- **Gráficos**: Recharts
- **QR**: qrcode
- **Fechas**: date-fns
- **Notificaciones**: react-hot-toast
- **Iconos**: lucide-react
- **Fuentes**: Bebas Neue (display), DM Sans (body), DM Mono

---

## ⚙️ Variables de entorno

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 🚢 Deploy en Vercel

```bash
npm run build
# Subir carpeta dist a Vercel, o conectar repo directo
# Agregar variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel
```

---

## 📱 Portal de miembros

El portal de miembros es **mobile-first** (max-width 480px) con:
- Acceso por DNI + PIN de 4 dígitos
- Dashboard con estado de membresía
- Reserva/cancelación de clases
- Rutina asignada con detalle de ejercicios
- Progreso corporal con gráficos
- Código QR personal para check-in
- Historial de asistencia tipo heatmap

---

Desarrollado con ❤️ por **Daniel Gómez** · [danogomezdev@gmail.com](mailto:danogomezdev@gmail.com)
