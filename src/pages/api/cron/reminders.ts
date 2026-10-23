import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import type { ReminderCandidate } from '../../../types/database';

export const prerender = false;

export const ALL: APIRoute = async ({ request, url }) => {
  try {
    // 1. Verificación opcional de Token de Seguridad para Cron Jobs de Vercel
    const authHeader = request.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isManual = url.searchParams.get('manual') === 'true';
    const mode = url.searchParams.get('mode') || (isManual ? 'test' : 'production');

    if (cronSecret && !isManual && authHeader !== `Bearer ${cronSecret}`) {
      // Si no es petición manual desde el admin ni tiene el Bearer secreto
      // return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401 });
    }

    const now = new Date();
    const siteUrl = process.env.PUBLIC_SITE_URL || 'https://darshall-estudio.vercel.app';

    // Rango de búsqueda: Citas completadas hace ~21 días (ventana de 20 a 22 días para tolerancia)
    const daysTarget = 21;
    const dateStart = new Date(now.getTime() - (daysTarget + 1) * 24 * 60 * 60 * 1000).toISOString();
    const dateEnd = new Date(now.getTime() - (daysTarget - 1) * 24 * 60 * 60 * 1000).toISOString();

    // 2. Obtener citas completadas según el modo (test: todas las completadas | production: ~21 días)
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        id,
        appointment_date,
        status,
        client_id,
        clients ( id, full_name, whatsapp_phone ),
        services ( name ),
        specialists ( full_name )
      `)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false });

    if (mode === 'production') {
      query = query.gte('appointment_date', dateStart).lte('appointment_date', dateEnd);
    }

    const { data: pastAppointments, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    const candidates: ReminderCandidate[] = [];
    const skippedWithFutureAppointment: string[] = [];

    // 3. Evaluar cada clienta individualmente
    for (const app of (pastAppointments || [])) {
      const client = (app as any).clients;
      const service = (app as any).services;
      const specialist = (app as any).specialists;

      if (!client || !client.whatsapp_phone) continue;

      // CONDICIÓN CRÍTICA: ¿Tiene la clienta alguna cita FUTURA agendada?
      const { data: futureAppointments, error: futureError } = await supabaseAdmin
        .from('appointments')
        .select('id, appointment_date, status')
        .eq('client_id', client.id)
        .gt('appointment_date', now.toISOString())
        .in('status', ['scheduled', 'in_progress'])
        .limit(1);

      if (futureError) throw futureError;

      const hasFutureAppointment = Boolean(futureAppointments && futureAppointments.length > 0);

      if (hasFutureAppointment) {
        skippedWithFutureAppointment.push(client.full_name);
        continue; // Omitir, la clienta ya tiene su cita programada
      }

      // Verificar si ya se le envió un recordatorio por esta cita en particular
      const { data: existingLog } = await supabaseAdmin
        .from('reminder_logs')
        .select('id')
        .eq('appointment_id', app.id)
        .maybeSingle();

      const appDate = new Date(app.appointment_date);
      const diffDays = Math.round((now.getTime() - appDate.getTime()) / (1000 * 3600 * 24));

      // Construcción del mensaje personalizado
      const messageText = `Hola ${client.full_name}, se cumplen 3 semanas desde tu último servicio de uñas en ${process.env.PUBLIC_STUDIO_NAME || 'Darshall Estudio'}. ¡Es momento de tu mantenimiento para mantener tus uñas sanas e impecables! Agenda tu espacio aquí: ${siteUrl}/#agendar`;

      // Limpieza de formato telefónico para WhatsApp
      const cleanPhone = client.whatsapp_phone.replace(/[^0-9]/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

      candidates.push({
        appointment_id: app.id,
        client_id: client.id,
        client_name: client.full_name,
        whatsapp_phone: client.whatsapp_phone,
        service_name: service?.name || 'Servicio de Uñas',
        specialist_name: specialist?.full_name || 'Especialista',
        completion_date: app.appointment_date,
        days_since: diffDays,
        has_future_appointment: false,
        whatsapp_url: whatsappUrl,
        message_text: messageText,
        already_notified: Boolean(existingLog)
      });
    }

    // Si la petición es POST y viene con auto_send o confirmación de registro
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (body.mark_sent && body.appointment_id && body.client_id) {
        await supabaseAdmin.from('reminder_logs').insert({
          appointment_id: body.appointment_id,
          client_id: body.client_id,
          phone: body.phone,
          message_text: body.message_text
        });

        return new Response(JSON.stringify({ success: true, message: 'Recordatorio registrado como enviado' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(
      JSON.stringify({
        timestamp: now.toISOString(),
        total_examined: pastAppointments?.length || 0,
        candidates_to_remind: candidates.length,
        skipped_already_booked: skippedWithFutureAppointment.length,
        skipped_clients: skippedWithFutureAppointment,
        candidates
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en Cron Reminders:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
