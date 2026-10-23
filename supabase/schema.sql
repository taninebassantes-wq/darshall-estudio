-- ==============================================================================
-- DARSHALL ESTUDIO - ESQUEMA COMPLETO DE BASE DE DATOS SUPABASE
-- Idempotente (se puede ejecutar múltiples veces sin errores)
-- ==============================================================================

-- 1. EXTENSIÓN UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM DE ESTADOS
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA: SPECIALISTS (Manicuristas)
CREATE TABLE IF NOT EXISTS public.specialists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    commission_rate NUMERIC(4, 2) NOT NULL DEFAULT 0.40 CHECK (commission_rate >= 0 AND commission_rate <= 1),
    is_active BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA: SERVICES (Catálogo de Servicios)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA: CLIENTS (Clientas)
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    whatsapp_phone TEXT NOT NULL UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABLA: APPOINTMENTS (Citas Agendadas)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    appointment_date TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABLA: PRODUCTIVITY_LOGS (Registro de Comisiones y Liquidaciones)
CREATE TABLE IF NOT EXISTS public.productivity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES public.appointments(id) ON DELETE CASCADE,
    specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
    service_amount NUMERIC(10, 2) NOT NULL CHECK (service_amount >= 0),
    commission_rate NUMERIC(4, 2) NOT NULL,
    commission_earned NUMERIC(10, 2) NOT NULL CHECK (commission_earned >= 0),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABLA: REMINDER_LOGS (Control de Recordatorios Enviados)
CREATE TABLE IF NOT EXISTS public.reminder_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    phone TEXT NOT NULL,
    message_text TEXT NOT NULL
);

-- 9. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_appointments_specialist_date ON public.appointments(specialist_id, appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_productivity_specialist_logged ON public.productivity_logs(specialist_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(whatsapp_phone);

-- 10. TRIGGER AUTOMÁTICO: CÁLCULO DE COMISIONES AL COMPLETAR CITA
CREATE OR REPLACE FUNCTION public.handle_appointment_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_service_price NUMERIC(10, 2);
    v_commission_rate NUMERIC(4, 2);
    v_commission_earned NUMERIC(10, 2);
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        SELECT price INTO v_service_price FROM public.services WHERE id = NEW.service_id;
        SELECT commission_rate INTO v_commission_rate FROM public.specialists WHERE id = NEW.specialist_id;
        
        IF v_commission_rate IS NULL THEN 
            v_commission_rate := 0.40; 
        END IF;

        v_commission_earned := ROUND((v_service_price * v_commission_rate), 2);

        INSERT INTO public.productivity_logs (
            appointment_id, specialist_id, service_amount, commission_rate, commission_earned, logged_at
        ) VALUES (
            NEW.id, NEW.specialist_id, v_service_price, v_commission_rate, v_commission_earned, timezone('utc'::text, now())
        )
        ON CONFLICT (appointment_id) 
        DO UPDATE SET
            service_amount = EXCLUDED.service_amount,
            commission_rate = EXCLUDED.commission_rate,
            commission_earned = EXCLUDED.commission_earned;
            
    ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        DELETE FROM public.productivity_logs WHERE appointment_id = NEW.id;
    END IF;

    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_appointment_completion ON public.appointments;
CREATE TRIGGER trigger_appointment_completion
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_appointment_completion();

-- 11. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productivity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

-- 12. POLÍTICAS DE ACCESO
DROP POLICY IF EXISTS "Public read active services" ON public.services;
CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read active specialists" ON public.specialists;
CREATE POLICY "Public read active specialists" ON public.specialists FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Public read appointment slots" ON public.appointments;
CREATE POLICY "Public read appointment slots" ON public.appointments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert client" ON public.clients;
CREATE POLICY "Public insert client" ON public.clients FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public insert appointment" ON public.appointments;
CREATE POLICY "Public insert appointment" ON public.appointments FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to specialists" ON public.specialists;
CREATE POLICY "Full access to specialists" ON public.specialists FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to services" ON public.services;
CREATE POLICY "Full access to services" ON public.services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to clients" ON public.clients;
CREATE POLICY "Full access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to appointments" ON public.appointments;
CREATE POLICY "Full access to appointments" ON public.appointments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to productivity" ON public.productivity_logs;
CREATE POLICY "Full access to productivity" ON public.productivity_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access to reminders" ON public.reminder_logs;
CREATE POLICY "Full access to reminders" ON public.reminder_logs FOR ALL USING (true) WITH CHECK (true);

-- 13. DATOS DE PRUEBA (SEED)
INSERT INTO public.specialists (full_name, phone, commission_rate, is_active, bio) VALUES
    ('Valentina Mendoza', '+593991234567', 0.45, true, 'Master Nail Artist en Esculpidas y Acrílico'),
    ('Camila Robalino', '+593998765432', 0.40, true, 'Especialista en Esmaltado Semipermanente y Ruso'),
    ('Sofía Herrera', '+593984561230', 0.40, true, 'Experta en Soft Gel y Nail Art Mano Alzada')
ON CONFLICT DO NOTHING;

INSERT INTO public.services (name, description, price, duration_minutes, is_active) VALUES
    ('Manicura Rusa + Semipermanente', 'Limpieza profunda de cutícula con torno y esmaltado semipermanente de alta duración.', 28.00, 75, true),
    ('Extensión Soft Gel (Gel X)', 'Extensiones ultraligeras y naturales con cobertura completa y nivelación de apex.', 42.00, 90, true),
    ('Esculpidas Acrílicas / Polygel', 'Construcción con molde, acabado estilizado e incluye diseño básico.', 48.00, 120, true),
    ('Mantenimiento / Retoque (3 semanas)', 'Relleno de crecimiento, rebalance estructural y cambio de diseño.', 32.00, 90, true),
    ('Pedicura Spa Premium', 'Exfoliación con sales, retiro de callosidades, masaje hidratante y esmaltado.', 30.00, 60, true)
ON CONFLICT DO NOTHING;
