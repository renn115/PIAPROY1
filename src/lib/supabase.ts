import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'docente' | 'orientador' | 'admin';
  activo: boolean;
  created_at: string;
}

export interface Estudiante {
  id: string;
  nombre: string;
  grupo: string;
  edad?: number;
  entorno_familiar?: string;
  created_at: string;
}

export interface Observacion {
  id: string;
  estudiante_id: string;
  docente_id: string;
  comportamiento: string;
  nivel_atencion: 'bajo' | 'medio' | 'alto';
  interaccion_social: number;
  seguimiento_instrucciones: number;
  concentracion: number;
  fecha_observacion?: string;
  created_at: string;
  estudiante?: Estudiante;
  docente?: Usuario;
}

export interface Scoring {
  id: string;
  estudiante_id: string;
  orientador_id: string;
  nivel_riesgo: 'bajo' | 'medio' | 'alto';
  puntuacion: number;
  detalles: Record<string, unknown>;
  created_at: string;
  estudiante?: Estudiante;
}

export interface ComentarioOrientador {
  id: string;
  estudiante_id: string;
  orientador_id: string;
  comentario: string;
  created_at: string;
  estudiante?: Estudiante;
  orientador?: Usuario;
  respuestas?: RespuestaComentario[];
}

export interface RespuestaComentario {
  id: string;
  comentario_id: string;
  usuario_id: string;
  respuesta: string;
  created_at: string;
  usuario?: Usuario;
}

export interface MejoraDocente {
  id: string;
  estudiante_id: string;
  docente_id: string;
  fecha: string;
  mejora: string;
  created_at: string;
  estudiante?: Estudiante;
  docente?: Usuario;
}

export interface LogEliminacion {
  id: string;
  estudiante_nombre: string;
  estudiante_grupo?: string;
  docente_id?: string;
  docente_nombre?: string;
  created_at: string;
}

export interface CasoSeguimiento {
  id: string;
  estudiante_id: string;
  orientador_id: string;
  estado: 'abierto' | 'en_seguimiento' | 'cerrado';
  observaciones?: string;
  created_at: string;
  updated_at: string;
  estudiante?: Estudiante;
  orientador?: Usuario;
}

export async function loginUser(email: string, password: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', email)
    .eq('password', password)
    .eq('activo', true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Usuario;
}

export function calcularScoring(observaciones: Observacion[]): {
  puntuacion: number;
  nivel_riesgo: 'bajo' | 'medio' | 'alto';
  detalles: Record<string, number>;
} {
  if (observaciones.length === 0) {
    return { puntuacion: 0, nivel_riesgo: 'bajo', detalles: {} };
  }

  const promedios = {
    atencion: 0,
    interaccion: 0,
    seguimiento: 0,
    concentracion: 0,
  };

  observaciones.forEach((obs) => {
    const atencionValor = obs.nivel_atencion === 'bajo' ? 1 : obs.nivel_atencion === 'medio' ? 3 : 5;
    promedios.atencion += atencionValor;
    promedios.interaccion += obs.interaccion_social;
    promedios.seguimiento += obs.seguimiento_instrucciones;
    promedios.concentracion += obs.concentracion;
  });

  const n = observaciones.length;
  promedios.atencion /= n;
  promedios.interaccion /= n;
  promedios.seguimiento /= n;
  promedios.concentracion /= n;

  const puntuacion = (
    (5 - promedios.atencion) * 25 +
    (5 - promedios.interaccion) * 20 +
    (5 - promedios.seguimiento) * 25 +
    (5 - promedios.concentracion) * 30
  );

  const nivel_riesgo: 'bajo' | 'medio' | 'alto' =
    puntuacion >= 60 ? 'alto' : puntuacion >= 30 ? 'medio' : 'bajo';

  return {
    puntuacion: Math.round(puntuacion * 10) / 10,
    nivel_riesgo,
    detalles: {
      atencion_promedio: Math.round(promedios.atencion * 10) / 10,
      interaccion_promedio: Math.round(promedios.interaccion * 10) / 10,
      seguimiento_promedio: Math.round(promedios.seguimiento * 10) / 10,
      concentracion_promedio: Math.round(promedios.concentracion * 10) / 10,
      observaciones_analizadas: n,
    },
  };
}
