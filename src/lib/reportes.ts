import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Observacion, Scoring, MejoraDocente, ComentarioOrientador, CasoSeguimiento, Usuario, LogEliminacion } from './supabase';

// Tipos para reportes
interface DatosReporteIndividual {
  estudiante: {
    nombre: string;
    grupo: string;
    edad?: number;
    entorno_familiar?: string;
  };
  observaciones: Observacion[];
  scoring?: Scoring;
  mejoras: MejoraDocente[];
  comentarios: ComentarioOrientador[];
  estadoCaso?: CasoSeguimiento;
}

interface DatosReporteGlobal {
  totalUsuarios: number;
  totalEstudiantes: number;
  totalObservaciones: number;
  distribucionRiesgo: {
    alto: number;
    medio: number;
    bajo: number;
  };
  observacionesPorGrupo: Record<string, number>;
  casosPorEstado?: {
    abierto: number;
    en_seguimiento: number;
    cerrado: number;
  };
  // Datos completos para incluir en el reporte
  usuarios?: Usuario[];
  observaciones?: Observacion[];
  scorings?: Scoring[];
  eliminaciones?: LogEliminacion[];
}

/**
 * Genera un reporte PDF individual de un estudiante
 */
export function generarReportePDFIndividual(datos: DatosReporteIndividual): void {
  const doc = new jsPDF();
  let yPos = 20;

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte Individual de Estudiante', 14, yPos);
  yPos += 10;

  // Información del estudiante
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Información del Estudiante', 14, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nombre: ${datos.estudiante.nombre}`, 14, yPos);
  yPos += 5;
  doc.text(`Grupo: ${datos.estudiante.grupo}`, 14, yPos);
  yPos += 5;
  if (datos.estudiante.edad) {
    doc.text(`Edad: ${datos.estudiante.edad} años`, 14, yPos);
    yPos += 5;
  }
  if (datos.estudiante.entorno_familiar) {
    doc.text(`Entorno Familiar: ${datos.estudiante.entorno_familiar}`, 14, yPos);
    yPos += 5;
  }

  yPos += 5;

  // Scoring
  if (datos.scoring) {
    doc.setFont('helvetica', 'bold');
    doc.text('Evaluación de Riesgo', 14, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Nivel de Riesgo: ${datos.scoring.nivel_riesgo.toUpperCase()}`, 14, yPos);
    yPos += 5;
    doc.text(`Puntuación: ${datos.scoring.puntuacion.toFixed(1)}`, 14, yPos);
    yPos += 5;
    if (datos.scoring.detalles) {
      const detalles = datos.scoring.detalles as Record<string, number>;
      if (detalles.atencion_promedio) doc.text(`Atención promedio: ${detalles.atencion_promedio.toFixed(1)}`, 14, yPos);
      yPos += 5;
      if (detalles.concentracion_promedio) doc.text(`Concentración promedio: ${detalles.concentracion_promedio.toFixed(1)}`, 14, yPos);
      yPos += 5;
    }
    yPos += 5;
  }

  // Estado del caso
  if (datos.estadoCaso) {
    doc.setFont('helvetica', 'bold');
    doc.text('Estado del Caso', 14, yPos);
    yPos += 7;

    doc.setFont('helvetica', 'normal');
    doc.text(`Estado: ${datos.estadoCaso.estado.toUpperCase()}`, 14, yPos);
    yPos += 5;
    doc.text(`Última actualización: ${new Date(datos.estadoCaso.updated_at).toLocaleDateString('es-ES')}`, 14, yPos);
    yPos += 5;
    yPos += 5;
  }

  // Observaciones
  if (datos.observaciones.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Observaciones (${datos.observaciones.length})`, 14, yPos);
    yPos += 7;

    const observacionesData = datos.observaciones.map((obs, index) => [
      index + 1,
      obs.comportamiento.substring(0, 50) + (obs.comportamiento.length > 50 ? '...' : ''),
      obs.nivel_atencion,
      obs.interaccion_social + '/5',
      obs.seguimiento_instrucciones + '/5',
      obs.concentracion + '/5',
      obs.fecha_observacion ? new Date(obs.fecha_observacion).toLocaleDateString('es-ES') : new Date(obs.created_at).toLocaleDateString('es-ES'),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Comportamiento', 'Atención', 'Interacción', 'Seguimiento', 'Concentración', 'Fecha']],
      body: observacionesData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Mejoras
  if (datos.mejoras.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Mejoras Registradas (${datos.mejoras.length})`, 14, yPos);
    yPos += 7;

    const mejorasData = datos.mejoras.map((mejora) => [
      new Date(mejora.fecha).toLocaleDateString('es-ES'),
      mejora.mejora.substring(0, 70) + (mejora.mejora.length > 70 ? '...' : ''),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['Fecha', 'Mejora Observada']],
      body: mejorasData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Comentarios
  if (datos.comentarios.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Comentarios del Orientador (${datos.comentarios.length})`, 14, yPos);
    yPos += 7;

    datos.comentarios.forEach((comentario, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`${index + 1}. ${new Date(comentario.created_at).toLocaleDateString('es-ES')}`, 14, yPos);
      yPos += 5;
      doc.setFontSize(8);
      const lines = doc.splitTextToSize(comentario.comentario, 180);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 4 + 5;
    });
  }

  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, 200, 285, { align: 'right' });
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 285);
  }

  // Guardar
  doc.save(`reporte-${datos.estudiante.nombre.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}

/**
 * Genera un reporte PDF global del sistema
 */
export function generarReportePDFGlobal(datos: DatosReporteGlobal): void {
  const doc = new jsPDF();
  let yPos = 20;

  // Título
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Reporte Global del Sistema', 14, yPos);
  yPos += 10;

  // Estadísticas generales
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Estadísticas Generales', 14, yPos);
  yPos += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Total de Usuarios: ${datos.totalUsuarios}`, 14, yPos);
  yPos += 5;
  doc.text(`Total de Estudiantes: ${datos.totalEstudiantes}`, 14, yPos);
  yPos += 5;
  doc.text(`Total de Observaciones: ${datos.totalObservaciones}`, 14, yPos);
  yPos += 5;
  yPos += 5;

  // Distribución de riesgo
  doc.setFont('helvetica', 'bold');
  doc.text('Distribución de Riesgo', 14, yPos);
  yPos += 7;

  const riesgoData = [
    ['Alto Riesgo', datos.distribucionRiesgo.alto],
    ['Medio Riesgo', datos.distribucionRiesgo.medio],
    ['Bajo Riesgo', datos.distribucionRiesgo.bajo],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['Nivel de Riesgo', 'Cantidad']],
    body: riesgoData,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Observaciones por grupo
  if (Object.keys(datos.observacionesPorGrupo).length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones por Grupo', 14, yPos);
    yPos += 7;

    const gruposData = Object.entries(datos.observacionesPorGrupo).map(([grupo, count]) => [grupo, count]);

    autoTable(doc, {
      startY: yPos,
      head: [['Grupo', 'Cantidad de Observaciones']],
      body: gruposData,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Casos por estado (si existe)
  if (datos.casosPorEstado) {
    doc.setFont('helvetica', 'bold');
    doc.text('Casos por Estado', 14, yPos);
    yPos += 7;

    const estadosData = [
      ['Abierto', datos.casosPorEstado.abierto],
      ['En Seguimiento', datos.casosPorEstado.en_seguimiento],
      ['Cerrado', datos.casosPorEstado.cerrado],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Estado', 'Cantidad']],
      body: estadosData,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [239, 68, 68] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // USUARIOS DEL SISTEMA
  if (datos.usuarios && datos.usuarios.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Usuarios del Sistema (${datos.usuarios.length})`, 14, yPos);
    yPos += 7;

    const usuariosData = datos.usuarios.map((usuario, index) => [
      index + 1,
      usuario.nombre,
      usuario.email,
      usuario.rol,
      usuario.activo ? 'Activo' : 'Inactivo',
      new Date(usuario.created_at).toLocaleDateString('es-ES'),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Nombre', 'Email', 'Rol', 'Estado', 'Fecha Registro']],
      body: usuariosData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 45 },
        2: { cellWidth: 55 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 35 },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // OBSERVACIONES DETALLADAS
  if (datos.observaciones && datos.observaciones.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Observaciones Registradas (${datos.observaciones.length})`, 14, yPos);
    yPos += 7;

    // Agrupar observaciones por estudiante
    const observacionesPorEstudiante = new Map<string, Observacion[]>();
    datos.observaciones.forEach((obs) => {
      const estudianteId = obs.estudiante_id;
      const estudianteNombre = (obs as any).estudiante?.nombre || 'Desconocido';
      if (!observacionesPorEstudiante.has(estudianteId)) {
        observacionesPorEstudiante.set(estudianteId, []);
      }
      observacionesPorEstudiante.get(estudianteId)!.push(obs);
    });

    observacionesPorEstudiante.forEach((obsList, estudianteId) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      const primeraObs = obsList[0];
      const estudianteNombre = (primeraObs as any).estudiante?.nombre || 'Desconocido';
      const estudianteGrupo = (primeraObs as any).estudiante?.grupo || 'N/A';
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`${estudianteNombre} - Grupo: ${estudianteGrupo} (${obsList.length} observaciones)`, 14, yPos);
      yPos += 7;

      const observacionesData = obsList.map((obs, index) => [
        index + 1,
        obs.comportamiento.substring(0, 40) + (obs.comportamiento.length > 40 ? '...' : ''),
        obs.nivel_atencion || 'N/A',
        obs.interaccion_social + '/5',
        obs.seguimiento_instrucciones + '/5',
        obs.concentracion + '/5',
        (obs as any).docente?.nombre || 'N/A',
        obs.fecha_observacion ? new Date(obs.fecha_observacion).toLocaleDateString('es-ES') : new Date(obs.created_at).toLocaleDateString('es-ES'),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Comportamiento', 'Atención', 'Interacción', 'Seguimiento', 'Concentración', 'Docente', 'Fecha']],
        body: observacionesData,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [16, 185, 129] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 45 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 20 },
          6: { cellWidth: 35 },
          7: { cellWidth: 25 },
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    });
  }

  // SCORING DE ESTUDIANTES
  if (datos.scorings && datos.scorings.length > 0) {
    // Agrupar scoring por estudiante (mantener solo el más reciente)
    const scoringPorEstudiante = new Map<string, Scoring>();
    datos.scorings.forEach((scoring) => {
      const estudianteId = scoring.estudiante_id;
      if (!scoringPorEstudiante.has(estudianteId)) {
        scoringPorEstudiante.set(estudianteId, scoring);
      } else {
        const existente = scoringPorEstudiante.get(estudianteId)!;
        if (new Date(scoring.created_at) > new Date(existente.created_at)) {
          scoringPorEstudiante.set(estudianteId, scoring);
        }
      }
    });

    const scoringUnicos = Array.from(scoringPorEstudiante.values());

    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Evaluaciones de Riesgo (${scoringUnicos.length} estudiantes)`, 14, yPos);
    yPos += 7;

    const scoringData = scoringUnicos.map((scoring, index) => {
      const estudianteNombre = (scoring as any).estudiante?.nombre || 'Desconocido';
      const estudianteGrupo = (scoring as any).estudiante?.grupo || 'N/A';
      return [
        index + 1,
        estudianteNombre,
        estudianteGrupo,
        scoring.nivel_riesgo.toUpperCase(),
        scoring.puntuacion.toFixed(1),
        new Date(scoring.created_at).toLocaleDateString('es-ES'),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Estudiante', 'Grupo', 'Nivel Riesgo', 'Puntuación', 'Fecha Evaluación']],
      body: scoringData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
        5: { cellWidth: 35 },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // ELIMINACIONES
  if (datos.eliminaciones && datos.eliminaciones.length > 0) {
    // Agrupar eliminaciones por estudiante (mantener solo la más reciente)
    const eliminacionesPorEstudiante = new Map<string, LogEliminacion>();
    datos.eliminaciones.forEach((log) => {
      const nombre = log.estudiante_nombre;
      if (!eliminacionesPorEstudiante.has(nombre)) {
        eliminacionesPorEstudiante.set(nombre, log);
      } else {
        const existente = eliminacionesPorEstudiante.get(nombre)!;
        if (new Date(log.created_at) > new Date(existente.created_at)) {
          eliminacionesPorEstudiante.set(nombre, log);
        }
      }
    });

    const eliminacionesUnicas = Array.from(eliminacionesPorEstudiante.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Historial de Eliminaciones (${eliminacionesUnicas.length} estudiantes)`, 14, yPos);
    yPos += 7;

    const eliminacionesData = eliminacionesUnicas.map((log, index) => [
      index + 1,
      log.estudiante_nombre,
      log.estudiante_grupo || 'N/A',
      log.docente_nombre || 'N/A',
      new Date(log.created_at).toLocaleDateString('es-ES'),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [['#', 'Estudiante Eliminado', 'Grupo', 'Eliminado por', 'Fecha Eliminación']],
      body: eliminacionesData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 55 },
        2: { cellWidth: 25 },
        3: { cellWidth: 45 },
        4: { cellWidth: 35 },
      },
    });
  }

  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(`Página ${i} de ${pageCount}`, 200, 285, { align: 'right' });
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 285);
  }

  // Guardar
  doc.save(`reporte-global-${new Date().toISOString().split('T')[0]}.pdf`);
}


