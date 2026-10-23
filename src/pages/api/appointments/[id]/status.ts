import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!id || !validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'ID o estado no válido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Actualizar estado en la base de datos
    // Nota: El trigger 'trigger_appointment_completion' de PostgreSQL creará automáticamente
    // el registro en 'productivity_logs' y calculará las comisiones si status es 'completed'.
    const { data: updatedAppointment, error } = await supabaseAdmin
      .from('appointments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, specialists(full_name, commission_rate), services(name, price)')
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Estado actualizado a ${status}`,
        appointment: updatedAppointment
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error al actualizar estado:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
