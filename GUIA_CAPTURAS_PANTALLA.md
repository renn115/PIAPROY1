# Guía de Capturas de Pantalla para Documentación
## Plataforma NeuroEDU - Sistema de Detección Temprana de NEE

Esta guía indica exactamente qué capturas tomar y dónde insertarlas en la documentación.

---

## 📸 LISTA DE CAPTURAS RECOMENDADAS

### 🔐 MÓDULO DE AUTENTICACIÓN (3 capturas)

#### 1. Pantalla de Login
**Ubicación:** `src/components/Login.tsx`  
**Qué capturar:**
- Formulario completo de inicio de sesión
- Campos: Email y Contraseña
- Botón "Ingresar"
- Mensaje de usuarios de prueba (si está visible)
- Diseño con figuras decorativas de fondo

**Nombre sugerido:** `01_login_pantalla_principal.png`  
**Insertar en documento:** Sección "Módulo de Autenticación"

---

#### 2. Error de Credenciales Inválidas
**Cómo reproducir:**
- Ingresar email incorrecto o contraseña incorrecta
- Click en "Ingresar"

**Qué capturar:**
- Mensaje de error en rojo: "Credenciales inválidas..."
- Formulario visible

**Nombre sugerido:** `02_login_error_credenciales.png`  
**Insertar en documento:** Sección "Manejo de Errores"

---

#### 3. Login Exitoso (Redirección)
**Cómo reproducir:**
- Login exitoso con cualquier usuario
- Mostrar redirección al panel correspondiente

**Qué capturar:**
- El panel que aparece después del login (Admin/Docente/Orientador)
- Header con información del usuario

**Nombre sugerido:** `03_login_redireccion_exitosa.png`  
**Insertar en documento:** Sección "Flujo de Trabajo"

---

### 👨‍🏫 MÓDULO DOCENTE (8 capturas)

#### 4. Panel Principal del Docente
**Ubicación:** `src/components/Docente.tsx`  
**Qué capturar:**
- Vista completa del panel docente
- Formulario de observación a la izquierda
- Panel lateral con "Comentarios del orientador"
- Panel "Mis estudiantes"

**Nombre sugerido:** `04_docente_panel_principal.png`  
**Insertar en documento:** Sección "Módulo de Docente" > "Vista General"

---

#### 5. Formulario de Observación (Vacío)
**Qué capturar:**
- Formulario completo antes de llenarlo
- Todos los campos visibles:
  - Nombre del estudiante
  - Grupo
  - Edad
  - Entorno familiar
  - Comportamiento en clase
  - Nivel de atención
  - Fecha de observación
  - Interacción social (1-5)
  - Seguimiento de instrucciones (1-5)
  - Concentración (1-5)
- Botón "Enviar observación"

**Nombre sugerido:** `05_docente_formulario_vacio.png`  
**Insertar en documento:** Sección "Módulo de Docente" > "Registro de Observaciones"

---

#### 6. Formulario de Observación (Completado)
**Qué capturar:**
- Mismo formulario con datos de ejemplo completados
- Todos los campos llenos con información de prueba

**Nombre sugerido:** `06_docente_formulario_completado.png`  
**Insertar en documento:** Sección "Módulo de Docente" > "Registro de Observaciones"

---

#### 7. Mensaje de Confirmación de Observación Enviada
**Cómo reproducir:**
- Enviar una observación exitosamente
- Capturar el mensaje verde de confirmación

**Qué capturar:**
- Banner verde con mensaje: "✅ Observación registrada exitosamente"

**Nombre sugerido:** `07_docente_observacion_enviada.png`  
**Insertar en documento:** Sección "Módulo de Docente" > "Validación de Datos"

---

#### 8. Panel "Mis Estudiantes"
**Qué capturar:**
- Panel lateral derecho con lista de estudiantes
- Estudiantes con badges de notificaciones (si hay)
- Información de cada estudiante visible
- Botón de eliminar visible

**Nombre sugerido:** `08_docente_mis_estudiantes.png`  
**Insertar en documento:** Sección "Módulo de Docente" > "Gestión de Estudiantes"

---

#### 9. Modal de Comentarios del Orientador
**Cómo reproducir:**
- Click en "Ver conversación completa" de un estudiante con comentarios
- Abrir el modal

**Qué capturar:**
- Modal completo con conversaciones
- Comentarios del orientador
- Respuestas del docente
- Formulario para responder

**Nombre sugerido:** `09_docente_modal_comentarios.png`  
**Insertar en documento:** Sección "Módulo de Docente" > "Sistema de Comentarios"

---

#### 10. Modal de Registro de Mejoras
**Cómo reproducir:**
- Click en un estudiante de "Mis estudiantes"
- Abrir modal de mejoras

**Qué capturar:**
- Observación inicial visible
- Formulario para nueva mejora
- Lista de mejoras registradas (si hay)

**Nombre sugerido:** `10_docente_modal_mejoras.png`  
**Insertar en documento:** Sección "Módulo de Docente" > "Registro de Mejoras"

---

#### 11. Modal de Confirmación de Eliminación de Estudiante
**Cómo reproducir:**
- Click en botón eliminar de un estudiante
- Abrir modal de confirmación

**Qué capturar:**
- Modal de advertencia
- Lista de consecuencias
- Botones "Cancelar" y "Sí, eliminar"

**Nombre sugerido:** `11_docente_confirmar_eliminacion.png`  
**Insertar en documento:** Sección "Módulo de Docente" > "Gestión de Estudiantes"

---

### 🎓 MÓDULO ORIENTADOR (6 capturas)

#### 12. Panel Principal del Orientador - Casos Recibidos
**Ubicación:** `src/components/Orientador.tsx`  
**Qué capturar:**
- Tabla completa de casos
- Agrupación por docente
- Columnas: Estudiante, Grupo, Observaciones, Nivel de Riesgo, Acciones
- Estudiantes con y sin scoring (para mostrar ambos estados)

**Nombre sugerido:** `12_orientador_casos_recibidos.png`  
**Insertar en documento:** Sección "Módulo de Orientador" > "Vista de Casos Recibidos"

---

#### 13. Modal Detallado de Estudiante - Sin Scoring
**Cómo reproducir:**
- Click en "Ver Observaciones" de un estudiante sin scoring

**Qué capturar:**
- Modal completo
- Todas las observaciones listadas
- Métricas de cada observación
- Sección de mejoras (vacía si no hay)
- Formulario de comentarios

**Nombre sugerido:** `13_orientador_modal_sin_scoring.png`  
**Insertar en documento:** Sección "Módulo de Orientador" > "Visualización Detallada"

---

#### 14. Botón "Generar Scoring" y Resultado
**Cómo reproducir:**
- Click en "Generar scoring"
- Esperar a que se calcule
- Capturar la actualización de la tabla

**Qué capturar:**
- Badge de nivel de riesgo apareciendo (bajo/medio/alto)
- Puntuación numérica visible
- Color correspondiente (verde/amarillo/rojo)

**Nombre sugerido:** `14_orientador_scoring_generado.png`  
**Insertar en documento:** Sección "Módulo de Orientador" > "Generación de Scoring"

---

#### 15. Modal Detallado - Con Scoring y Mejoras
**Qué capturar:**
- Modal completo de estudiante
- Nivel de riesgo visible en header
- Todas las observaciones
- Sección de mejoras registradas (si hay)
- Sistema de comentarios y conversaciones

**Nombre sugerido:** `15_orientador_modal_completo.png`  
**Insertar en documento:** Sección "Módulo de Orientador" > "Visualización Detallada"

---

#### 16. Sistema de Comentarios - Conversación Completa
**Qué capturar:**
- Thread completo de comentarios y respuestas
- Formulario para nuevo comentario
- Formularios para responder a cada comentario
- Fechas y autores visibles

**Nombre sugerido:** `16_orientador_conversacion_completa.png`  
**Insertar en documento:** Sección "Módulo de Orientador" > "Comunicación con Docentes"

---

### 👨‍💼 MÓDULO ADMINISTRADOR (8 capturas)

#### 17. Dashboard Principal del Administrador
**Ubicación:** `src/components/Admin.tsx`  
**Qué capturar:**
- 5 tarjetas de estadísticas:
  - Usuarios (con botón "Gestionar")
  - Observaciones
  - Distribución de Riesgo
  - Grupos Activos
  - Eliminados
- Números actualizados visibles

**Nombre sugerido:** `17_admin_dashboard_principal.png`  
**Insertar en documento:** Sección "Módulo de Administración" > "Dashboard de Estadísticas"

---

#### 18. Tabla de Usuarios
**Qué capturar:**
- Tabla completa con todos los usuarios
- Columnas: Nombre, Email, Rol, Estado, Acciones
- Badges de rol (docente/orientador/admin)
- Badges de estado (Activo/Inactivo)
- Botones de acción visibles

**Nombre sugerido:** `18_admin_tabla_usuarios.png`  
**Insertar en documento:** Sección "Módulo de Administración" > "Gestión de Usuarios"

---

#### 19. Modal de Crear Usuario
**Cómo reproducir:**
- Click en "Gestionar" o botón de crear usuario
- Abrir modal

**Qué capturar:**
- Modal completo de creación
- Campos: Nombre, Email, Contraseña, Rol
- Selector de rol con opciones
- Botones "Crear usuario" y "Cancelar"

**Nombre sugerido:** `19_admin_modal_crear_usuario.png`  
**Insertar en documento:** Sección "Módulo de Administración" > "Gestión de Usuarios"

---

#### 20. Modal de Confirmación - Activar/Desactivar Usuario
**Cómo reproducir:**
- Click en "Dar de baja" o "Activar" de un usuario
- Abrir modal de confirmación

**Qué capturar:**
- Modal de confirmación
- Mensaje de advertencia
- Botones de acción

**Nombre sugerido:** `20_admin_confirmar_estado.png`  
**Insertar en documento:** Sección "Módulo de Administración" > "Gestión de Usuarios"

---

#### 21. Modal Detalle - Observaciones
**Cómo reproducir:**
- Click en tarjeta "Observaciones"
- Abrir modal

**Qué capturar:**
- Modal con observaciones agrupadas por estudiante
- Información completa de cada observación
- Fechas y docentes visibles

**Nombre sugerido:** `21_admin_modal_observaciones.png`  
**Insertar en documento:** Sección "Módulo de Administración" > "Visualización Detallada"

---

#### 22. Modal Detalle - Distribución de Riesgo
**Cómo reproducir:**
- Click en tarjeta "Distribución de Riesgo"
- Abrir modal

**Qué capturar:**
- 3 tarjetas con conteos: Alto, Medio, Bajo
- Lista de estudiantes con su nivel de riesgo
- Badges de colores según nivel

**Nombre sugerido:** `22_admin_modal_riesgo.png`  
**Insertar en documento:** Sección "Módulo de Administración" > "Visualización Detallada"

---

#### 23. Notificaciones de Eliminación
**Cómo reproducir:**
- Tener al menos una eliminación reciente
- Mostrar las notificaciones rojas en el dashboard

**Qué capturar:**
- Banner rojo de notificación
- Información del estudiante eliminado
- Docente responsable
- Fecha y hora
- Botón de cerrar (X)

**Nombre sugerido:** `23_admin_notificaciones_eliminacion.png`  
**Insertar en documento:** Sección "Módulo de Administración" > "Notificaciones de Eliminaciones"

---

#### 24. Modal Detalle - Historial de Eliminaciones
**Cómo reproducir:**
- Click en tarjeta "Eliminados"
- Abrir modal de historial

**Qué capturar:**
- Lista completa de estudiantes eliminados
- Información de cada eliminación
- Fechas y responsables

**Nombre sugerido:** `24_admin_historial_eliminaciones.png`  
**Insertar en documento:** Sección "Módulo de Administración" > "Notificaciones de Eliminaciones"

---

## 📐 ESPECIFICACIONES TÉCNICAS PARA CAPTURAS

### Resolución Recomendada
- **Mínimo:** 1920x1080 (Full HD)
- **Recomendado:** 2560x1440 o superior
- **Formato:** PNG (para máxima calidad) o JPG (si se optimiza)

### Áreas de Captura
- **Captura de pantalla completa:** Para vistas generales
- **Captura de ventana:** Para modales y ventanas específicas
- **Captura de región:** Para elementos específicos (opcional)

### Herramientas Recomendadas
- **Windows:** Herramienta de Recortes (Snipping Tool) o Win+Shift+S
- **Mac:** Cmd+Shift+4 (región) o Cmd+Shift+3 (pantalla completa)
- **Chrome DevTools:** Para capturas de elementos específicos (F12 > Cmd/Ctrl+Shift+P > "Screenshot")

### Edición Básica Recomendada
- Recortar bordes innecesarios
- Resaltar elementos importantes con flechas o recuadros (opcional)
- Agregar números o etiquetas para referencias (opcional)
- Asegurar que el texto sea legible

### Nomenclatura de Archivos
```
[NUMERO]_[MODULO]_[DESCRIPCION].png

Ejemplos:
01_login_pantalla_principal.png
04_docente_panel_principal.png
12_orientador_casos_recibidos.png
17_admin_dashboard_principal.png
```

---

## 📍 DÓNDE INSERTAR CADA CAPTURA EN EL DOCUMENTO

### En la Documentación Principal (`DOCUMENTACION_PLATAFORMA.md`)

#### Sección: "Módulo de Autenticación"
- **01_login_pantalla_principal.png** - Después del párrafo "Sistema de Login"
- **02_login_error_credenciales.png** - En subsección "Manejo de Errores"
- **03_login_redireccion_exitosa.png** - Al final de la sección

#### Sección: "Módulo de Docente"
- **04_docente_panel_principal.png** - Al inicio de la sección
- **05_docente_formulario_vacio.png** - Subsección "Registro de Observaciones"
- **06_docente_formulario_completado.png** - Justo después de la anterior
- **07_docente_observacion_enviada.png** - En "Validación de Datos"
- **08_docente_mis_estudiantes.png** - Subsección "Gestión de Estudiantes"
- **09_docente_modal_comentarios.png** - Subsección "Sistema de Comentarios"
- **10_docente_modal_mejoras.png** - Subsección "Registro de Mejoras"
- **11_docente_confirmar_eliminacion.png** - En "Gestión de Estudiantes"

#### Sección: "Módulo de Orientador"
- **12_orientador_casos_recibidos.png** - Al inicio de la sección
- **13_orientador_modal_sin_scoring.png** - Subsección "Visualización Detallada"
- **14_orientador_scoring_generado.png** - Subsección "Generación de Scoring"
- **15_orientador_modal_completo.png** - Subsección "Visualización Detallada"
- **16_orientador_conversacion_completa.png** - Subsección "Comunicación con Docentes"

#### Sección: "Módulo de Administración"
- **17_admin_dashboard_principal.png** - Subsección "Dashboard de Estadísticas"
- **18_admin_tabla_usuarios.png** - Subsección "Gestión de Usuarios"
- **19_admin_modal_crear_usuario.png** - En "Gestión de Usuarios"
- **20_admin_confirmar_estado.png** - En "Gestión de Usuarios"
- **21_admin_modal_observaciones.png** - Subsección "Visualización Detallada"
- **22_admin_modal_riesgo.png** - Subsección "Visualización Detallada"
- **23_admin_notificaciones_eliminacion.png** - Subsección "Notificaciones de Eliminaciones"
- **24_admin_historial_eliminaciones.png** - Subsección "Notificaciones de Eliminaciones"

### En el Análisis de Casos de Uso (`ANALISIS_CASOS_DE_USO.md`)

- Insertar capturas relevantes en las columnas "Evidencia" de la tabla
- Usar capturas que demuestren el cumplimiento de cada caso de uso

---

## 🎨 CAPTURAS ADICIONALES OPCIONALES

### Capturas de Flujo de Trabajo
- Secuencia mostrando: Login → Panel → Acción → Resultado
- Ejemplo: Login Docente → Formulario → Envío → Confirmación

### Capturas de Base de Datos (Opcional)
- Vista de tabla `observaciones` en Supabase
- Vista de tabla `scoring` con datos
- Relaciones entre tablas

### Capturas de Código (Opcional)
- Funciones clave con sintaxis destacada
- Estructura de componentes principales

---

## ✅ CHECKLIST DE CAPTURAS

- [ ] 01 - Login pantalla principal
- [ ] 02 - Login error credenciales
- [ ] 03 - Login redirección exitosa
- [ ] 04 - Docente panel principal
- [ ] 05 - Docente formulario vacío
- [ ] 06 - Docente formulario completado
- [ ] 07 - Docente observación enviada
- [ ] 08 - Docente mis estudiantes
- [ ] 09 - Docente modal comentarios
- [ ] 10 - Docente modal mejoras
- [ ] 11 - Docente confirmar eliminación
- [ ] 12 - Orientador casos recibidos
- [ ] 13 - Orientador modal sin scoring
- [ ] 14 - Orientador scoring generado
- [ ] 15 - Orientador modal completo
- [ ] 16 - Orientador conversación completa
- [ ] 17 - Admin dashboard principal
- [ ] 18 - Admin tabla usuarios
- [ ] 19 - Admin modal crear usuario
- [ ] 20 - Admin confirmar estado
- [ ] 21 - Admin modal observaciones
- [ ] 22 - Admin modal riesgo
- [ ] 23 - Admin notificaciones eliminación
- [ ] 24 - Admin historial eliminaciones

**Total de capturas recomendadas: 24**

---

## 💡 TIPS PARA MEJORES CAPTURAS

1. **Usar datos de prueba realistas:** Llenar formularios con datos coherentes
2. **Mostrar estados diferentes:** Capturar casos con y sin datos
3. **Incluir contexto:** Asegurar que se vea la funcionalidad completa
4. **Evitar información sensible:** Usar solo datos de prueba/demo
5. **Capturas limpias:** Cerrar pestañas innecesarias, limpiar escritorio
6. **Mostrar interacciones:** Capturar antes/durante/después de acciones importantes
7. **Consistencia visual:** Usar el mismo navegador y tamaño de ventana

---

## 📁 ESTRUCTURA DE CARPETA SUGERIDA

```
docs/
├── capturas/
│   ├── 01_login_pantalla_principal.png
│   ├── 02_login_error_credenciales.png
│   ├── 03_login_redireccion_exitosa.png
│   ├── 04_docente_panel_principal.png
│   ├── ...
│   └── 24_admin_historial_eliminaciones.png
└── documentacion/
    ├── DOCUMENTACION_PLATAFORMA.md
    └── ANALISIS_CASOS_DE_USO.md
```

---

**Fecha de creación:** Noviembre 2024  
**Última actualización:** Noviembre 2024


