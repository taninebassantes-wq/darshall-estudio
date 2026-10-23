import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const prerender = false;

// GET: Consultar citas ocupadas para una especialista y fecha determinada
export const GET: APIRoute = async ({ url }) => {
  try {
    const specialistId = url.searchParams.get('specialist_id');
    const dateStr = url.searchParams.get('date'); // YYYY-MM-DD

    if (!specialistId || !dateStr) {
      return new Response(JSON.stringify({ error: 'specialist_id y date son requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select('id, appointment_date, status, services(duration_minutes, name)')
      .eq('specialist_id', specialistId)
      .in('status', ['scheduled', 'in_progress'])
      .gte('appointment_date', startOfDay)
      .lte('appointment_date', endOfDay);

    if (error) throw error;

    return new Response(JSON.stringify({ appointments }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Agendamiento de nueva cita con validación anti-traslape
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { full_name, whatsapp_phone, specialist_id, service_id, appointment_date, notes } = body;

    if (!full_name || !whatsapp_phone || !specialist_id || !service_id || !appointment_date) {
      return new Response(JSON.stringify({ error: 'Todos los campos obligatorios deben estar presentes' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1. Obtener detalles del servicio seleccionado para conocer duración
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single();

    if (serviceError || !service) {
      return new Response(JSON.stringify({ error: 'Servicio no encontrado o inactivo' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Comprobar que no exista solapamiento/traslape de citas
    const requestedStart = new Date(appointment_date);
    const requestedEnd = new Date(requestedStart.getTime() + service.duration_minutes * 60000);

    // Buscar citas activas de la manicurista en esa misma ventana de tiempo
    // Ventana amplia: desde 3 horas antes hasta 3 horas después
    const windowStart = new Date(requestedStart.getTime() - 180 * 60000).toISOString();
    const windowEnd = new Date(requestedEnd.getTime() + 180 * 60000).toISOString();

    const { data: existingAppointments, error: conflictError } = await supabaseAdmin
      .from('appointments')
      .select('id, appointment_date, services(duration_minutes)')
      .eq('specialist_id', specialist_id)
      .in('status', ['scheduled', 'in_progress'])
      .gte('appointment_date', windowStart)
      .lte('appointment_date', windowEnd);

    if (conflictError) throw conflictError;

    // Verificar si alguna cita choca en el rango de minutos
    const isConflict = existingAppointments?.some((app: any) => {
      const appStart = new Date(app.appointment_date).getTime();
      const appDuration = (app.services?.duration_minutes || 60) * 60000;
      const appEnd = appStart + appDuration;

      const reqStart = requestedStart.getTime();
      const reqEnd = requestedEnd.getTime();

      // Existe traslape si el inicio solicitado es menor al fin existente y el fin solicitado es mayor al inicio existente
      return reqStart < appEnd && reqEnd > appStart;
    });

    if (isConflict) {
      return new Response(
        JSON.stringify({
          error: 'El horario seleccionado ya no está disponible para esta especialista. Por favor elige otro horario.'
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Registrar o actualizar clienta (por teléfono de WhatsApp)
    let clientId: string;
    const cleanPhone = whatsapp_phone.replace(/\s+/g, '');

    const { data: existingClient, error: clientFetchError } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('whatsapp_phone', cleanPhone)
      .maybeSingle();

    if (clientFetchError) throw clientFetchError;

    if (existingClient) {
      clientId = existingClient.id;
      // Actualizar nombre si cambió
      await supabaseAdmin
        .from('clients')
        .update({ full_name })
        .eq('id', clientId);
    } else {
      const { data: newClient, error: clientCreateError } = await supabaseAdmin
        .from('clients')
        .insert({
          full_name,
          whatsapp_phone: cleanPhone,
        })
        .select('id')
        .single();

      if (clientCreateError) throw clientCreateError;
      clientId = newClient.id;
    }

    // 4. Crear la cita en estado 'scheduled'
    const { data: newAppointment, error: appCreateError } = await supabaseAdmin
      .from('appointments')
      .insert({
        client_id: clientId,
        specialist_id,
        service_id,
        appointment_date: requestedStart.toISOString(),
        status: 'scheduled',
        notes: notes || null
      })
      .select('id, appointment_date, status, specialists(full_name), services(name, price)')
      .single();

    if (appCreateError) throw appCreateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: '¡Cita confirmada exitosamente!',
        appointment: newAppointment
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error al agendar cita:', err);
    return new Response(JSON.stringify({ error: err.message || 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
