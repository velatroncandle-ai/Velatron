# 📚 Sistema Dinámico de Cómics - Velatron

El sistema ahora carga los cómics **automáticamente** desde la carpeta `comics/`, sin necesidad de editar el código manualmente.

## 🎯 Opciones disponibles

### Opción 1: Usar el servidor Python (Recomendado)

**Ventajas:**
- ✅ 100% dinámico y en tiempo real
- ✅ No necesitas generar archivos adicionales
- ✅ Los cómics aparecen automáticamente al subirlos

**Cómo usar:**

1. **Inicia el servidor Python:**
   ```bash
   python server.py
   ```
   O doble clic en `start_server.bat`

2. **Abre tu sitio web**
   - El servidor corre en `http://localhost:5000`
   - Tu web debe estar en `http://localhost:8000` (o el puerto que uses)

3. **Los cómics se cargan automáticamente**
   - Al abrir la página, se conecta a `http://localhost:5000/list-comics`
   - Obtiene todos los cómics disponibles en la carpeta

---

### Opción 2: Usar archivo JSON estático

**Ventajas:**
- ✅ No necesitas el servidor Python corriendo
- ✅ Más rápido en carga inicial
- ✅ Funciona sin backend

**Cómo usar:**

1. **Genera el archivo JSON:**
   ```bash
   python generate_comics_json.py
   ```

2. **Esto crea `comics.json`** con todos los cómics disponibles

3. **Actualiza el JSON cada vez que agregues nuevos cómics**

4. **Tu web cargará automáticamente desde `comics.json`**

---

### Opción 3: Datos estáticos (Fallback)

Si ni el servidor ni el JSON están disponibles, el sistema usará los datos estáticos hardcodeados en el HTML.

## 📁 Estructura esperada de carpetas

```
comics/
├── jhon/
│   └── temporada1/
│       ├── portada.avif
│       ├── 1.avif
│       ├── 2.avif
│       └── ...
├── keiner/
│   └── temporada1/
│       ├── portada.avif
│       ├── 1.avif
│       └── ...
└── nuevo-comic/
    ├── temporada1/
    │   ├── portada.avif
    │   └── ...
    └── temporada2/
        ├── portada.avif
        └── ...
```

## 🔄 Flujo de carga

1. **Intenta cargar desde servidor Python** (`http://localhost:5000/list-comics`)
   - Si falla → paso 2

2. **Intenta cargar desde comics.json**
   - Si falla → paso 3

3. **Usa datos estáticos del HTML**

## 🚀 Agregar nuevos cómics

### Con servidor Python:

1. **Sube el cómic desde el panel admin** (`admin.html`)
2. **Listo!** El cómic aparece automáticamente

### Sin servidor (solo JSON):

1. **Copia las carpetas** a `comics/nombre-comic/temporadaX/`
2. **Ejecuta:**
   ```bash
   python generate_comics_json.py
   ```
3. **Recarga la página web**

## 📊 Formato de datos

El sistema espera este formato:

```json
{
  "jhon-temporada1": {
    "images": [
      "comics/jhon/temporada1/1.avif",
      "comics/jhon/temporada1/2.avif"
    ],
    "cover": "comics/jhon/temporada1/portada.avif",
    "folder": "jhon",
    "season": "temporada1",
    "count": 13
  }
}
```

## ✅ Ventajas del sistema dinámico

1. **No más edición manual** del código
2. **Escalable** - agrega cientos de cómics fácilmente
3. **Mantiene compatibilidad** con el código existente
4. **Múltiples opciones** según tus necesidades
5. **Fallback automático** si algo falla

## 🔧 Troubleshooting

### Los cómics no aparecen:

1. **Verifica la estructura de carpetas**
2. **Asegúrate que las imágenes sean .avif**
3. **Revisa la consola del navegador** (F12)
4. **Si usas servidor, verifica que esté corriendo**
5. **Si usas JSON, regenera el archivo**

### Error de CORS:

Si ves errores de CORS en la consola:
- Asegúrate que el servidor Python esté corriendo
- Verifica que `Flask-CORS` esté instalado
- O usa la opción de JSON estático

## 💡 Recomendación

**Para desarrollo:** Usa el servidor Python (opción 1)
**Para producción:** Genera `comics.json` y úsalo (opción 2)

---

**¡Ahora tu sitio de cómics es totalmente dinámico!** 🎉
