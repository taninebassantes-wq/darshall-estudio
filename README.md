# 💅 Darshall Estudio — Nails & Beauty Studio Management App

Sistema Integral de Gestión y Agendamiento para Estudios de Uñas, construido con **Astro (SSR)**, **Tailwind CSS**, **Supabase (PostgreSQL & RLS)** y optimizado para despliegue serverless en **Vercel**.

---

## 🚀 Arquitectura y Tecnologías
- **Frontend / SSR:** Astro v4+ con `@astrojs/vercel/serverless`.
- **Estilos:** Tailwind CSS con paleta estética boutique (rosa pastel, beige cálido, pizarra y acentos dorados).
- **Base de Datos & Auth:** Supabase PostgreSQL con Row Level Security (RLS) e índices de alta concurrencia.
- **Automatización de Comisiones:** Trigger nativo en PostgreSQL `trigger_appointment_completion` que calcula e inserta en `productivity_logs` de forma atómica.
- **Motor de Retención WhatsApp:** Endpoint automatizado y panel administrativo que detecta citas cumplidas a los 21 días (3 semanas), verifica condicionalmente si la clienta ya tiene una cita futura, y dispara recordatorios directos sin reincidencia innecesaria.
- **Despliegue:** Vercel (con soporte para Vercel Cron jobs definidos en `vercel.json`).

---

## 📁 Estructura del Proyecto

```text
├── supabase/
│   └── schema.sql                 # Script SQL completo: tablas, RLS, triggers y seed
├── src/
│   ├── env.d.ts                   # Tipos de variables de entorno
│   ├── types/
│   │   └── database.ts            # Interfaces TypeScript de la base de datos
│   ├── lib/
│   │   ├── supabase.ts            # Clientes Supabase (Anon y Service Role)
│   │   └── date-utils.ts          # Formateadores de fecha, moneda y franjas horarias
│   ├── layouts/
│   │   ├── Layout.astro           # Layout público para agendamiento
│   │   └── AdminLayout.astro      # Layout del dashboard con barra lateral y estado
│   └── pages/
│       ├── index.astro            # [MÓDULO 1] Agendamiento público con validación anti-traslapes
│       ├── admin/
│       │   ├── agenda.astro       # [MÓDULO 2] Cronograma de trabajo y cambio de estados
│       │   ├── productividad.astro# [MÓDULO 3] Tablero de ingresos y liquidación de comisiones
│       │   └── recordatorios.astro# [MÓDULO 4] Motor de recordatorios a las 3 semanas
│       └── api/
│           ├── appointments/
│           │   ├── index.ts       # POST reserva (con validación de solapamiento) & GET slots
│           │   └── [id]/status.ts # PATCH / POST cambio de estado de citas
│           └── cron/
│               └── reminders.ts   # Endpoint Cron verificador condicional de 21 días
├── public/
│   └── favicon.svg
├── vercel.json                    # Configuración de cron diario a las 14:00 UTC
├── tailwind.config.mjs            # Paleta de colores personalizada boutique
├── astro.config.mjs               # Configuración Astro SSR con adaptador Vercel
├── package.json
└── .env.example
```

---

## 🛠️ Puesta en Marcha

### 1. Configurar Supabase
1. Crea un proyecto en [Supabase](https://supabase.com).
2. Ve al **SQL Editor** y ejecuta íntegramente el archivo [`supabase/schema.sql`](file:///c:/Users/UsuarioX360/Documents/TANNIA%20B/Proyectos/Darshall%20Estudio/supabase/schema.sql).
3. Obtén las credenciales en **Project Settings > API**:
   - `URL`
   - `anon public key`
   - `service_role secret key`

### 2. Configurar Variables de Entorno
Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```
Rellena las variables:
```env
PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
PUBLIC_STUDIO_NAME="Darshall Estudio"
PUBLIC_STUDIO_PHONE="+593991234567"
PUBLIC_SITE_URL=https://darshall-estudio.vercel.app
CRON_SECRET=clave_secreta_para_cron
```

### 3. Instalación y Ejecución Local
```bash
npm install
npm run dev
```
Visita `http://localhost:4321` en tu navegador.

---

## 🌐 Despliegue en Vercel
1. Conecta el repositorio en el Dashboard de [Vercel](https://vercel.com).
2. Configura las variables de entorno en **Settings > Environment Variables**:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PUBLIC_STUDIO_NAME`
   - `PUBLIC_SITE_URL`
   - `CRON_SECRET`
3. ¡Haz clic en **Deploy**! Vercel detectará automáticamente el adaptador `@astrojs/vercel` y programará el Cron diario especificado en `vercel.json`.
